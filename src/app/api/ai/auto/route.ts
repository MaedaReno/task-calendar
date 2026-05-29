import { NextRequest } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { autoParsePrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";

// z.coerce.number() で文字列数値にも対応、nullable/optional で null/undefined も許容
const TaskItemSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional().transform((v) => v ?? ""),
  estimatedHours: z.coerce.number().optional().default(1),
  suggestedDeadline: z.string(),
});

const EventItemSchema = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string(),
  description: z.string().nullable().optional(),
});

const ResponseSchema = z.union([
  z.object({ type: z.literal("task"), tasks: z.array(TaskItemSchema) }),
  z.object({ type: z.literal("event"), event: EventItemSchema }),
]);

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) {
      return Response.json({ error: "input is required" }, { status: 400 });
    }

    const model = getModel();
    const prompt = autoParsePrompt(input);

    const result = await withTimeout(() =>
      withRetry(async () => {
        const res = await model.generateContent(prompt);
        return res.response.text();
      })
    );

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(result);
    } catch {
      console.error("[ai/auto] JSON parse error. Raw:", result);
      throw new AIError("ai_parse_error");
    }

    const parsed = ResponseSchema.safeParse(rawJson);
    if (!parsed.success) {
      console.error("[ai/auto] Schema validation failed:", parsed.error.flatten(), "Raw:", result);
      throw new AIError("ai_parse_error");
    }

    return Response.json(parsed.data);
  } catch (err) {
    return handleAIError(err);
  }
}
