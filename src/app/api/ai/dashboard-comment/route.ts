import { NextRequest } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { dashboardCommentPrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId, unauthorized } from "@/lib/workspace";
import { todayJST, jstToUTC, addDays } from "@/lib/datetime";
import type { EventData, SubTaskData } from "@/types";

const ResponseSchema = z.object({ comment: z.string() });

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(req);
    if (!workspaceId) return unauthorized();
    // JST 固定運用。ローカルTZ依存の setHours ではなく lib/datetime のJST境界を使う。
    const today = todayJST();
    const todayStart = new Date(jstToUTC(today, "00:00"));
    const todayEnd = new Date(
      new Date(jstToUTC(addDays(today, 1), "00:00")).getTime() - 1
    );

    const [events, subtasks, settings] = await Promise.all([
      prisma.event.findMany({
        where: { workspaceId, start: { gte: todayStart }, end: { lte: todayEnd } },
      }),
      prisma.subTask.findMany({
        where: {
          task: { workspaceId },
          scheduledStart: { gte: todayStart, lte: todayEnd },
          status: { not: "done" },
        },
      }),
      prisma.userSettings.upsert({
        where: { workspaceId },
        create: { workspaceId },
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
