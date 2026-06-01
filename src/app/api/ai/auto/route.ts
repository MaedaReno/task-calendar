import { NextRequest } from "next/server";

export const maxDuration = 60;
import { z } from "zod";
import { getModel } from "@/lib/gemini";
import { extractTasksPrompt, parseEventPrompt } from "@/lib/ai-prompts";
import { handleAIError, withRetry, withTimeout, AIError } from "@/lib/ai-error";

// ① 分類用スキーマ（シンプルな固定構造）
const ClassifySchema = z.object({
  type: z.enum(["task", "event"]),
});

// ② タスク抽出スキーマ（既存 /api/ai/extract と同じ）
const TasksSchema = z.array(
  z.object({
    title: z.string(),
    description: z.string().nullable().optional().transform((v) => v ?? ""),
    estimatedHours: z.coerce.number().optional().default(1),
    suggestedDeadline: z.string(),
  })
);

// ② 予定抽出スキーマ（既存 /api/ai/parse-event と同じ）
const EventSchema = z.object({
  title: z.string(),
  start: z.string(),
  end: z.string(),
  description: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) {
      return Response.json({ error: "input is required" }, { status: 400 });
    }

    const model = getModel();

    // ステップ1: 分類（シンプルな固定JSONなので安定）
    const classifyPrompt = `以下の文章はタスク（やること・作業）ですか、それとも予定（日時が決まった出来事）ですか？
JSONのみ返してください。

文章: ${input}

レスポンス形式: {"type": "task"} または {"type": "event"}

判断基準:
- 「〜をする」「〜を準備する」「〜を勉強する」など達成すべき作業 → task
- 「〜がある」「〜と会う」「会議」「授業」「〜時から」など日時の決まった出来事 → event`;

    const classifyResult = await withTimeout(() =>
      withRetry(async () => {
        const res = await model.generateContent(classifyPrompt);
        return res.response.text();
      })
    );

    let classifyJson: unknown;
    try {
      classifyJson = JSON.parse(classifyResult);
    } catch {
      console.error("[ai/auto] classify JSON parse error:", classifyResult);
      throw new AIError("ai_parse_error");
    }

    const classify = ClassifySchema.safeParse(classifyJson);
    if (!classify.success) {
      console.error("[ai/auto] classify schema error:", classify.error.flatten());
      throw new AIError("ai_parse_error");
    }

    const { type } = classify.data;

    // ステップ2: 分類結果に応じた抽出（既存の実績あるプロンプトを再利用）
    if (type === "task") {
      const extractResult = await withTimeout(() =>
        withRetry(async () => {
          const res = await model.generateContent(extractTasksPrompt(input));
          return res.response.text();
        })
      );

      let rawJson: unknown;
      try { rawJson = JSON.parse(extractResult); } catch {
        throw new AIError("ai_parse_error");
      }

      const parsed = TasksSchema.safeParse(rawJson);
      if (!parsed.success) {
        console.error("[ai/auto] tasks schema error:", parsed.error.flatten(), "Raw:", extractResult);
        throw new AIError("ai_parse_error");
      }

      return Response.json({ type: "task", tasks: parsed.data });
    } else {
      const eventResult = await withTimeout(() =>
        withRetry(async () => {
          const res = await model.generateContent(parseEventPrompt(input));
          return res.response.text();
        })
      );

      let rawJson: unknown;
      try { rawJson = JSON.parse(eventResult); } catch {
        throw new AIError("ai_parse_error");
      }

      const parsed = EventSchema.safeParse(rawJson);
      if (!parsed.success) {
        console.error("[ai/auto] event schema error:", parsed.error.flatten(), "Raw:", eventResult);
        throw new AIError("ai_parse_error");
      }

      return Response.json({ type: "event", event: parsed.data });
    }
  } catch (err) {
    return handleAIError(err);
  }
}
