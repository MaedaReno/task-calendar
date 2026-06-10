import { NextRequest } from "next/server";
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { breakdownChatPrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";

export const maxDuration = 60;

const RequestSchema = z.object({
  taskTitle: z.string(),
  taskDescription: z.string().optional(),
  deadline: z.string(),
  estimatedHours: z.number().optional().nullable(),
  history: z.array(
    z.object({ role: z.enum(["ai", "user"]), content: z.string() })
  ),
});

const ResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("question"), message: z.string() }),
  z.object({
    type: z.literal("proposal"),
    message: z.string(),
    subtasks: z.array(
      z.object({ title: z.string(), estimatedHours: z.number() })
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
    const { taskTitle, taskDescription, deadline, estimatedHours, history } =
      parsed.data;

    const model = getModel();
    const prompt = breakdownChatPrompt(
      taskTitle,
      taskDescription ?? "",
      deadline,
      estimatedHours,
      history
    );

    const result = await withTimeout(() =>
      withRetry(async () => {
        const res = await model.generateContent(prompt);
        return res.response.text();
      })
    );

    const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
    const parsedResponse = ResponseSchema.safeParse(JSON.parse(cleaned));
    if (!parsedResponse.success) throw new AIError("ai_parse_error");

    return Response.json(parsedResponse.data);
  } catch (err) {
    return handleAIError(err);
  }
}
