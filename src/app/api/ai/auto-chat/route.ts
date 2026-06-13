import { NextRequest } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { autoChatPrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";

const RequestSchema = z.object({
  history: z.array(
    z.object({ role: z.enum(["ai", "user"]), content: z.string() })
  ),
});

const ResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("question"),
    message: z.string(),
    options: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("proposal"),
    kind: z.literal("event"),
    message: z.string(),
    event: z.object({
      title: z.string(),
      start: z.string(),
      end: z.string(),
      description: z.string().nullable().optional(),
    }),
  }),
  z.object({
    type: z.literal("proposal"),
    kind: z.literal("task"),
    message: z.string(),
    tasks: z.array(
      z.object({
        title: z.string(),
        description: z.string().nullable().optional().transform((v) => v ?? ""),
        estimatedHours: z.coerce.number().optional().default(1),
        startDate: z.string().optional(),
        suggestedDeadline: z.string(),
      })
    ),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }

    const model = getModel();
    const prompt = autoChatPrompt(parsed.data.history);

    const result = await withTimeout(() =>
      withRetry(async () => {
        const res = await model.generateContent(prompt);
        return res.response.text();
      })
    );

    const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(cleaned);
    } catch {
      console.error("[ai/auto-chat] JSON parse error:", cleaned);
      throw new AIError("ai_parse_error");
    }

    const parsedResponse = ResponseSchema.safeParse(rawJson);
    if (!parsedResponse.success) {
      console.error("[ai/auto-chat] schema error:", parsedResponse.error.flatten(), "Raw:", cleaned);
      throw new AIError("ai_parse_error");
    }

    return Response.json(parsedResponse.data);
  } catch (err) {
    return handleAIError(err);
  }
}
