import { NextRequest } from "next/server";
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { parseEventPrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";

const ResponseSchema = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string(),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) {
      return Response.json({ error: "input is required" }, { status: 400 });
    }

    const model = getModel();
    const prompt = parseEventPrompt(input);

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
