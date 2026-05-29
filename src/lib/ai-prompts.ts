import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { SubTaskData, EventData, UserSettingsData } from "@/types";

const TZ = "Asia/Tokyo";

function nowJST() {
  return format(toZonedTime(new Date(), TZ), "yyyy-MM-dd HH:mm");
}

export function extractTasksPrompt(input: string): string {
  return `あなたはタスク管理アシスタントです。
現在日時: ${nowJST()} (JST)

ユーザーの入力から具体的なタスクを抽出し、以下のJSON形式で返してください。
コードブロックや説明文は不要です。JSONのみ返してください。

ユーザー入力:
${input}

レスポンス形式:
[
  {
    "title": "タスクのタイトル",
    "description": "タスクの詳細説明",
    "estimatedHours": 推定作業時間（数値、時間単位）,
    "suggestedDeadline": "YYYY-MM-DDTHH:mm:ss+09:00"
  }
]`;
}

export function breakdownPrompt(
  taskTitle: string,
  taskDescription: string,
  deadline: string,
  estimatedHours?: number | null
): string {
  return `あなたはタスク管理アシスタントです。
現在日時: ${nowJST()} (JST)

以下のタスクを実行可能なサブタスクに分解してください。
コードブロックや説明文は不要です。JSONのみ返してください。

タスク: ${taskTitle}
説明: ${taskDescription || "なし"}
期日: ${deadline}
合計見積時間: ${estimatedHours ? `${estimatedHours}時間` : "未定"}

レスポンス形式:
[
  {
    "title": "サブタスクのタイトル",
    "estimatedHours": 推定作業時間（数値、時間単位）
  }
]`;
}

export function executionPlanPrompt(
  subtasks: SubTaskData[],
  events: EventData[],
  settings: UserSettingsData,
  deadline: string
): string {
  const subtaskList = subtasks
    .map((s, i) => `${i + 1}. ${s.title} (${s.estimatedHours ?? 1}時間)`)
    .join("\n");

  const eventList =
    events.length === 0
      ? "なし"
      : events
          .map((e) => `- ${format(new Date(e.start), "MM/dd HH:mm")}〜${format(new Date(e.end), "HH:mm")}: ${e.title}`)
          .join("\n");

  return `あなたはスケジューリングアシスタントです。
現在日時: ${nowJST()} (JST)

以下のサブタスクを、既存の予定を避けて、期日までにスケジューリングしてください。
作業可能時間: ${settings.workStartHour}:00〜${settings.workEndHour}:00
期日: ${deadline}
コードブロックや説明文は不要です。JSONのみ返してください。

【サブタスク一覧】
${subtaskList}

【既存の予定 (この時間は使用不可)】
${eventList}

レスポンス形式:
[
  {
    "subtaskId": "サブタスクのID",
    "scheduledStart": "YYYY-MM-DDTHH:mm:ss+09:00",
    "scheduledEnd": "YYYY-MM-DDTHH:mm:ss+09:00"
  }
]

※サブタスクのIDは以下の通りです:
${subtasks.map((s) => `- ${s.id}: ${s.title}`).join("\n")}`;
}

export function parseEventPrompt(input: string): string {
  return `あなたはカレンダーアシスタントです。
現在日時: ${nowJST()} (JST)

ユーザーの入力から予定情報を抽出してください。
コードブロックや説明文は不要です。JSONのみ返してください。

ユーザー入力:
${input}

レスポンス形式:
{
  "title": "予定のタイトル",
  "start": "YYYY-MM-DDTHH:mm:ss+09:00",
  "end": "YYYY-MM-DDTHH:mm:ss+09:00",
  "description": "説明（任意）"
}

時刻が不明な場合はその日の09:00〜10:00をデフォルトにしてください。
終了時刻が不明な場合は開始時刻の1時間後にしてください。`;
}

export function autoParsePrompt(input: string): string {
  return `あなたはタスク・カレンダー管理アシスタントです。
現在日時: ${nowJST()} (JST)

ユーザーの入力を分析し、それが「タスク（作業・やること）」なのか「予定（日時が決まった出来事）」なのかを判断して返してください。
コードブロックや説明文は不要です。JSONのみ返してください。

判断基準:
- 「〜をする」「〜を完成させる」「〜を準備する」「〜を勉強する」など達成すべき作業 → task
- 「〜がある」「〜に行く」「〜と会う」「会議」「授業」「イベント」「〜時から」など日時が決まった出来事 → event

ユーザー入力:
${input}

タスクの場合のレスポンス:
{
  "type": "task",
  "tasks": [
    {
      "title": "タスクのタイトル",
      "description": "タスクの詳細説明",
      "estimatedHours": 推定作業時間（数値、時間単位）,
      "suggestedDeadline": "YYYY-MM-DDTHH:mm:ss+09:00"
    }
  ]
}

予定の場合のレスポンス:
{
  "type": "event",
  "event": {
    "title": "予定のタイトル",
    "start": "YYYY-MM-DDTHH:mm:ss+09:00",
    "end": "YYYY-MM-DDTHH:mm:ss+09:00",
    "description": "説明（任意、なければ省略）"
  }
}

時刻が不明な場合はその日の09:00〜10:00をデフォルトにしてください。
終了時刻が不明な場合は開始時刻の1時間後にしてください。`;
}

export function reportPrompt(
  completedCount: number,
  pendingCount: number,
  completedTitles: string[],
  pendingTitles: string[],
  period: string
): string {
  return `あなたはタスク管理アシスタントです。

${period}の進捗レポートを日本語で作成してください。
コードブロックは不要です。JSONのみ返してください。

完了したタスク (${completedCount}件):
${completedTitles.map((t) => `- ${t}`).join("\n") || "なし"}

未完了のタスク (${pendingCount}件):
${pendingTitles.map((t) => `- ${t}`).join("\n") || "なし"}

レスポンス形式:
{
  "summary": "全体的な進捗の要約（2〜3文）",
  "achievement": "達成できたことの評価",
  "advice": "今後に向けたアドバイス"
}`;
}

export function dashboardCommentPrompt(
  todayEvents: EventData[],
  todaySubtasks: SubTaskData[],
  settings: UserSettingsData
): string {
  const totalWorkMinutes =
    (settings.workEndHour - settings.workStartHour) * 60;
  const busyMinutes = todayEvents.reduce((sum, e) => {
    const diff =
      (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000;
    return sum + diff;
  }, 0);
  const freeHours = Math.max(0, (totalWorkMinutes - busyMinutes) / 60).toFixed(
    1
  );

  return `あなたはタスク管理アシスタントです。
現在日時: ${nowJST()} (JST)

今日の状況から一言コメントを生成してください（1〜2文）。
コードブロックは不要です。JSONのみ返してください。

今日の予定: ${todayEvents.length}件
今日のタスク: ${todaySubtasks.length}件
推定空き時間: ${freeHours}時間

レスポンス形式:
{ "comment": "一言コメント" }`;
}
