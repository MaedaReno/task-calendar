import { NextRequest } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { autoParsePrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";

const TaskItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  estimatedHours: z.number(),
  suggestedDeadline: z.string(),
});

const EventItemSchema = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string(),
  description: z.string().optional(),
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

    const parsed = ResponseSchema.safeParse(JSON.parse(result));
    if (!parsed.success) throw new AIError("ai_parse_error");

    return Response.json(parsed.data);
  } catch (err) {
    return handleAIError(err);
  }
}
