import { NextRequest } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { dashboardCommentPrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";
import { prisma } from "@/lib/prisma";
import type { EventData, SubTaskData } from "@/types";

const ResponseSchema = z.object({ comment: z.string() });

export async function GET(_req: NextRequest) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [events, subtasks, settings] = await Promise.all([
      prisma.event.findMany({
        where: { start: { gte: todayStart }, end: { lte: todayEnd } },
      }),
      prisma.subTask.findMany({
        where: {
          scheduledStart: { gte: todayStart, lte: todayEnd },
          status: { not: "done" },
        },
      }),
      prisma.userSettings.upsert({
        where: { id: "singleton" },
        create: { id: "singleton" },
        update: {},
      }),
    ]);

    const model = getModel();
    const prompt = dashboardCommentPrompt(
      events.map((e) => ({ ...e, start: e.start.toISOString(), end: e.end.toISOString() })) as EventData[],
      subtasks.map((s) => ({
        ...s,
        scheduledStart: s.scheduledStart?.toISOString() ?? null,
        scheduledEnd: s.scheduledEnd?.toISOString() ?? null,
      })) as SubTaskData[],
      settings
    );

    const result = await withTimeout(() =>
      withRetry(async () => {
        const res = await model.generateContent(prompt);
        return res.response.text();
      })
    );

    const parsed = ResponseSchema.safeParse(JSON.parse(result));
    if (!parsed.success) throw new AIError("ai_parse_error");

    return Response.json(parsed.data);
  } catch (err) {
    return handleAIError(err);
  }
}
