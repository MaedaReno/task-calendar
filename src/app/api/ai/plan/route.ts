import { NextRequest } from "next/server";
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { executionPlanPrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";
import { prisma } from "@/lib/prisma";
import type { SubTaskData, EventData, UserSettingsData } from "@/types";

const ResponseSchema = z.array(
  z.object({
    subtaskId: z.string(),
    scheduledStart: z.string(),
    scheduledEnd: z.string(),
  })
);

export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return Response.json({ error: "taskId is required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { subtasks: { orderBy: { order: "asc" } } },
    });
    if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

    const settings = await prisma.userSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    });

    const events = await prisma.event.findMany({
      where: {
        start: { gte: new Date() },
        end: { lte: task.deadline },
      },
    });

    const subtasks: SubTaskData[] = task.subtasks.map((s) => ({
      id: s.id,
      taskId: s.taskId,
      title: s.title,
      estimatedHours: s.estimatedHours,
      order: s.order,
      status: s.status as SubTaskData["status"],
      scheduledStart: s.scheduledStart?.toISOString() ?? null,
      scheduledEnd: s.scheduledEnd?.toISOString() ?? null,
    }));

    const eventData: EventData[] = events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      color: e.color,
    }));

    const settingsData: UserSettingsData = {
      id: settings.id,
      workStartHour: settings.workStartHour,
      workEndHour: settings.workEndHour,
      timezone: settings.timezone,
    };

    const model = getModel();
    const prompt = executionPlanPrompt(
      subtasks,
      eventData,
      settingsData,
      task.deadline.toISOString()
    );

    const result = await withTimeout(() =>
      withRetry(async () => {
        const res = await model.generateContent(prompt);
        return res.response.text();
      })
    );

    const parsed = ResponseSchema.safeParse(JSON.parse(result));
    if (!parsed.success) throw new AIError("ai_parse_error");

    // スケジュールをDBに保存
    await Promise.all(
      parsed.data.map((item) =>
        prisma.subTask.update({
          where: { id: item.subtaskId },
          data: {
            scheduledStart: new Date(item.scheduledStart),
            scheduledEnd: new Date(item.scheduledEnd),
          },
        })
      )
    );

    // サブタスク合計時間がtask.estimatedHoursを超えたら更新
    const totalHours = task.subtasks.reduce(
      (sum, s) => sum + (s.estimatedHours ?? 0),
      0
    );
    if (task.estimatedHours !== null && totalHours > (task.estimatedHours ?? 0)) {
      await prisma.task.update({
        where: { id: taskId },
        data: { estimatedHours: totalHours },
      });
    }

    return Response.json(parsed.data);
  } catch (err) {
    return handleAIError(err);
  }
}
