import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/workspace";
import { schedule, type BusyBlock, type SchedulerTaskInput } from "@/lib/scheduler";
import type { PlanResponse, Priority } from "@/types";

// LLM 配置をやめ、決定論スケジューラ(lib/scheduler.ts)で配置する。
// このルートは「DB読取 → schedule() → DB書込」のアダプタに徹する。
export async function POST(req: NextRequest) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return Response.json({ error: "taskId is required" }, { status: 400 });
    }

    const workspaceId = getWorkspaceId(req);
    const task = await prisma.task.findFirst({
      where: { id: taskId, workspaceId },
      include: { subtasks: { orderBy: { order: "asc" } } },
    });
    if (!task) return Response.json({ error: "Task not found" }, { status: 404 });

    const settings = await prisma.userSettings.upsert({
      where: { workspaceId },
      create: { workspaceId },
      update: {},
    });

    // 探索範囲に「部分的にでも重なる」既存予定を取得する(区間重複の正しい判定)。
    // 自ワークスペースの予定だけを busy として扱う。
    const now = new Date();
    const rangeStart = task.startDate && task.startDate > now ? task.startDate : now;
    const events = await prisma.event.findMany({
      where: {
        workspaceId,
        start: { lt: task.deadline },
        end: { gt: rangeStart },
      },
    });

    const schedulerTask: SchedulerTaskInput = {
      priority: task.priority as Priority,
      deadlineUtc: task.deadline.toISOString(),
      startDateUtc: task.startDate?.toISOString() ?? null,
      subtasks: task.subtasks.map((s) => ({
        id: s.id,
        order: s.order,
        estimatedHours: s.estimatedHours,
        title: s.title,
      })),
    };

    const busy: BusyBlock[] = events.map((e) => ({
      startUtc: e.start.toISOString(),
      endUtc: e.end.toISOString(),
    }));

    const result = schedule(schedulerTask, busy, {
      workStartHour: settings.workStartHour,
      workEndHour: settings.workEndHour,
      nowUtc: now.toISOString(),
    });

    // 再計画では、対象タスクの配置を一旦クリアしてから placed のみ書き戻す
    // (前回配置されたが今回未配置になったサブタスクの幽霊配置を防ぐ)。
    await prisma.$transaction([
      prisma.subTask.updateMany({
        where: { taskId },
        data: { scheduledStart: null, scheduledEnd: null },
      }),
      ...result.placed.map((p) =>
        prisma.subTask.update({
          where: { id: p.subtaskId },
          data: {
            scheduledStart: new Date(p.scheduledStartUtc),
            scheduledEnd: new Date(p.scheduledEndUtc),
          },
        })
      ),
    ]);

    // サブタスク合計時間が task.estimatedHours を超えたら更新(従来動作を踏襲)
    const totalHours = task.subtasks.reduce((sum, s) => sum + (s.estimatedHours ?? 0), 0);
    if (task.estimatedHours !== null && totalHours > (task.estimatedHours ?? 0)) {
      await prisma.task.update({
        where: { id: taskId },
        data: { estimatedHours: totalHours },
      });
    }

    const response: PlanResponse = {
      placed: result.placed.map((p) => ({
        subtaskId: p.subtaskId,
        scheduledStart: p.scheduledStartUtc,
        scheduledEnd: p.scheduledEndUtc,
      })),
      unplaced: result.unplaced,
    };
    return Response.json(response);
  } catch (err) {
    console.error("[ai/plan] error:", err);
    return Response.json({ error: "plan_failed" }, { status: 500 });
  }
}
