import { NextRequest } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { breakdownPrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";

const ResponseSchema = z.array(
  z.object({
    title: z.string(),
    estimatedHours: z.number(),
  })
);

export async function POST(req: NextRequest) {
  try {
    const { taskTitle, taskDescription, deadline, estimatedHours } =
      await req.json();
    if (!taskTitle || !deadline) {
      return Response.json(
        { error: "taskTitle and deadline are required" },
        { status: 400 }
      );
    }

    const model = getModel();
    const prompt = breakdownPrompt(
      taskTitle,
      taskDescription ?? "",
      deadline,
      estimatedHours
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
