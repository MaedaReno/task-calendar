// 決定論スケジューラ（純関数・DB/Next 非依存）。
// LLM に配置を任せず、優先度+締切でソートしたサブタスクを、作業可能時間帯
// (workStartHour〜workEndHour) の空き枠へ最早から貪欲配置する。
// 過去時刻・作業時間外・締切超過・サブタスク同士の重複は構造的に発生しない。
// 収まらないサブタスクは黙って消さず unplaced(理由付き) で返す。
//
// 将来拡張(要スキーマ変更): チャンク分割 / 依存関係 / 複数タスク横断の同時最適化。
import { utcToJSTDate, jstToUTC, addDays } from "@/lib/datetime";
import type { Priority, UnplacedReason } from "@/types";

export interface SchedulerSubtaskInput {
  id: string;
  order: number;
  estimatedHours: number | null;
  title: string;
}

export interface SchedulerTaskInput {
  priority: Priority;
  deadlineUtc: string;
  startDateUtc: string | null;
  subtasks: SchedulerSubtaskInput[];
}

export interface BusyBlock {
  startUtc: string;
  endUtc: string;
}

export interface SchedulerOptions {
  workStartHour: number;
  workEndHour: number;
  nowUtc: string;
  defaultEstimatedHours?: number;
  maxHorizonDays?: number;
}

export interface PlacedBlock {
  subtaskId: string;
  scheduledStartUtc: string;
  scheduledEndUtc: string;
}

export interface UnplacedBlock {
  subtaskId: string;
  title: string;
  reason: UnplacedReason;
}

export interface ScheduleResult {
  placed: PlacedBlock[];
  unplaced: UnplacedBlock[];
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const hhmm = (h: number) => `${String(h).padStart(2, "0")}:00`;
const ms = (iso: string) => new Date(iso).getTime();

interface Interval {
  start: number;
  end: number;
}

// 指定範囲の各日の作業窓から busy を差し引き、最早の連続空き(needMs)を返す。
function findEarliestSlot(
  needMs: number,
  startDate: string,
  deadlineDate: string,
  workStartHour: number,
  workEndHour: number,
  busy: Interval[],
  nowMs: number,
  deadlineMs: number,
  maxHorizonDays: number
): Interval | null {
  let date = startDate;
  for (let i = 0; i <= maxHorizonDays && date <= deadlineDate; i++, date = addDays(date, 1)) {
    const dayStart = ms(jstToUTC(date, hhmm(workStartHour)));
    // workEndHour=24 は翌日0時として扱う(Date が "24:00" を解釈できないため)
    const dayEnd =
      workEndHour >= 24
        ? ms(jstToUTC(addDays(date, 1), "00:00"))
        : ms(jstToUTC(date, hhmm(workEndHour)));

    const windowStart = Math.max(dayStart, nowMs); // 過去カット
    const windowEnd = Math.min(dayEnd, deadlineMs); // 締切カット
    if (windowStart >= windowEnd) continue;

    // busy を作業窓にクリップ→ソート→マージ
    const blocks = busy
      .filter((b) => b.start < windowEnd && b.end > windowStart)
      .map((b) => ({ start: Math.max(b.start, windowStart), end: Math.min(b.end, windowEnd) }))
      .sort((a, b) => a.start - b.start);

    const merged: Interval[] = [];
    for (const b of blocks) {
      const last = merged[merged.length - 1];
      if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
      else merged.push({ ...b });
    }

    // 空きギャップを走査し最初に needMs 入る位置へ配置
    let cursor = windowStart;
    for (const b of merged) {
      if (b.start - cursor >= needMs) return { start: cursor, end: cursor + needMs };
      cursor = Math.max(cursor, b.end);
    }
    if (windowEnd - cursor >= needMs) return { start: cursor, end: cursor + needMs };
  }
  return null;
}

export function schedule(
  task: SchedulerTaskInput,
  existingEvents: BusyBlock[],
  options: SchedulerOptions
): ScheduleResult {
  const {
    workStartHour,
    workEndHour,
    nowUtc,
    defaultEstimatedHours = 1,
    maxHorizonDays = 365,
  } = options;

  const placed: PlacedBlock[] = [];
  const unplaced: UnplacedBlock[] = [];
  const allUnplaced = (reason: UnplacedReason): ScheduleResult => ({
    placed: [],
    unplaced: task.subtasks.map((s) => ({ subtaskId: s.id, title: s.title, reason })),
  });

  // 作業窓が不正
  if (!(workStartHour < workEndHour)) return allUnplaced("invalid_work_window");

  const nowMs = ms(nowUtc);
  const deadlineMs = ms(task.deadlineUtc);

  // 探索範囲(JST日付)。開始可能日 = max(今日, startDate)
  const todayStr = utcToJSTDate(nowUtc);
  const startFromTask = task.startDateUtc ? utcToJSTDate(task.startDateUtc) : todayStr;
  const startDate = startFromTask > todayStr ? startFromTask : todayStr;
  const deadlineDate = utcToJSTDate(task.deadlineUtc);

  if (deadlineMs <= nowMs || deadlineDate < startDate) {
    return allUnplaced("deadline_in_past");
  }

  // 配置順: 優先度→締切→order→id。単一タスク内では priority/締切 は一定なので
  // 実質 order→id だが、将来の複数タスク横断に備えてキーを保持する。
  const sorted = [...task.subtasks].sort((a, b) => {
    const pr = PRIORITY_RANK[task.priority] - PRIORITY_RANK[task.priority];
    if (pr !== 0) return pr;
    if (a.order !== b.order) return a.order - b.order;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // 既存予定 + 確定済みブロックを busy として保持(サブタスク同士の重複防止)
  const busy: Interval[] = existingEvents.map((e) => ({ start: ms(e.startUtc), end: ms(e.endUtc) }));
  const workMinutesPerDay = (workEndHour - workStartHour) * 60;

  for (const st of sorted) {
    let needMinutes: number;
    if (st.estimatedHours == null || st.estimatedHours === 0) {
      needMinutes = Math.round(defaultEstimatedHours * 60);
    } else if (st.estimatedHours < 0) {
      unplaced.push({ subtaskId: st.id, title: st.title, reason: "invalid_estimate" });
      continue;
    } else {
      needMinutes = Math.round(st.estimatedHours * 60);
    }

    if (needMinutes > workMinutesPerDay) {
      // 1サブタスク=1連続ブロック制約のため、1日に収まらない長さは配置不能
      unplaced.push({ subtaskId: st.id, title: st.title, reason: "longer_than_workday" });
      continue;
    }

    const slot = findEarliestSlot(
      needMinutes * 60000,
      startDate,
      deadlineDate,
      workStartHour,
      workEndHour,
      busy,
      nowMs,
      deadlineMs,
      maxHorizonDays
    );

    if (slot) {
      placed.push({
        subtaskId: st.id,
        scheduledStartUtc: new Date(slot.start).toISOString(),
        scheduledEndUtc: new Date(slot.end).toISOString(),
      });
      busy.push(slot);
    } else {
      unplaced.push({ subtaskId: st.id, title: st.title, reason: "no_time_before_deadline" });
    }
  }

  return { placed, unplaced };
}
