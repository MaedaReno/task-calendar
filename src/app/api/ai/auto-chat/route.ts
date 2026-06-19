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

// 見積り時間は 0/空/極小を避け 0.25h 以上にクランプする。
const estimatedHoursClamp = z.coerce
  .number()
  .optional()
  .transform((v) => {
    const n = v && v > 0 ? v : 1;
    return n < 0.25 ? 0.25 : n;
  });

// 入力には予定とタスクが混在しうるため、proposal は events[] と tasks[] の両方を持つ。
// type:"proposal" は1バリアントなので z.union で問題なし。
const ResponseSchema = z.union([
  z.object({
    type: z.literal("question"),
    message: z.string(),
    options: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("proposal"),
    message: z.string(),
    events: z
      .array(
        z.object({
          title: z.string(),
          start: z.string(),
          end: z.string(),
          description: z.string().nullable().optional(),
        })
      )
      .default([]),
    tasks: z
      .array(
        z.object({
          title: z.string(),
          description: z.string().nullable().optional().transform((v) => v ?? ""),
          estimatedHours: estimatedHoursClamp,
          startDate: z.string().optional(),
          suggestedDeadline: z.string(),
        })
      )
      .default([]),
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
