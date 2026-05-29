import { NextRequest } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { reportPrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";
import { prisma } from "@/lib/prisma";

const ResponseSchema = z.object({
  summary: z.string(),
  achievement: z.string(),
  advice: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const { period, from, to } = await req.json();

    const tasks = await prisma.task.findMany({
      where: {
        ...(from && to
          ? {
              createdAt: {
                gte: new Date(from),
                lte: new Date(to),
              },
            }
          : {}),
      },
      include: { subtasks: true },
    });

    const completed = tasks.filter((t) => t.status === "done");
    const pending = tasks.filter((t) => t.status !== "done");

    const model = getModel();
    const prompt = reportPrompt(
      completed.length,
      pending.length,
      completed.map((t) => t.title),
      pending.map((t) => t.title),
      period ?? "指定期間"
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
