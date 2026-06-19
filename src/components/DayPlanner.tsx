"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { jstToUTC, utcToJSTDate, addDays } from "@/lib/datetime";
import type { EventData, TaskData } from "@/types";

interface Props {
  refresh?: number;
  onSubtaskToggled?: () => void;
}

type View = "day" | "week";

// JST の日付文字列から、その週の日曜始まりの週範囲を求める
function weekRange(dayStr: string): { from: string; to: string } {
  const dow = new Date(`${dayStr}T12:00:00+09:00`).getUTCDay(); // 0=日
  const from = addDays(dayStr, -dow);
  return { from, to: addDays(from, 6) };
}

export default function DayPlanner({ refresh, onSubtaskToggled }: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  const [view, setView] = useState<View>("day");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<EventData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [work, setWork] = useState({ start: 9, end: 21 });

  const dayStr = utcToJSTDate(currentDate.toISOString());
  const range =
    view === "week"
      ? weekRange(dayStr)
      : { from: dayStr, to: dayStr };
  const fromISO = jstToUTC(range.from, "00:00");
  const toISO = jstToUTC(range.to, "23:59");

  const fetchData = useCallback(async (fISO: string, tISO: string) => {
    const [evRes, taskRes] = await Promise.all([
      fetch(`/api/events?from=${fISO}&to=${tISO}`),
      fetch("/api/tasks"),
    ]);
    if (evRes.ok) setEvents(await evRes.json());
    if (taskRes.ok) setTasks(await taskRes.json());
  }, []);

  useEffect(() => {
    fetchData(fromISO, toISO);
  }, [fromISO, toISO, fetchData, refresh]);

  // 作業可能時間帯(設定)をタイムラインの表示範囲に反映する
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s) setWork({ start: s.workStartHour, end: s.workEndHour });
      })
      .catch(() => {});
  }, []);

  function navigate(dir: -1 | 0 | 1) {
    const step = view === "week" ? 7 : 1;
    const d = new Date(currentDate);
    if (dir === 0) {
      d.setTime(Date.now());
    } else {
      d.setDate(d.getDate() + dir * step);
    }
    setCurrentDate(d);
    calendarRef.current?.getApi().gotoDate(d);
  }

  function switchView(next: View) {
    setView(next);
    calendarRef.current
      ?.getApi()
      .changeView(next === "week" ? "timeGridWeek" : "timeGridDay");
  }

  // ISO(UTC) 文字列が現在の表示範囲内かどうか
  function isInRange(utcStr: string): boolean {
    return utcStr >= fromISO && utcStr <= toISO;
  }

  const calendarEvents = [
    ...events.map((e) => {
      if (e.allDay) {
        return {
          id: `ev-${e.id}`,
          title: e.title,
          start: utcToJSTDate(e.start),
          allDay: true,
          backgroundColor: e.color,
          borderColor: "transparent",
          extendedProps: { kind: "event" },
        };
      }
      return {
        id: `ev-${e.id}`,
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: e.color,
        borderColor: "transparent",
        extendedProps: { kind: "event" },
      };
    }),
    ...tasks.flatMap((task) =>
      (task.subtasks ?? [])
        .filter((s) => s.scheduledStart && isInRange(s.scheduledStart))
        .map((s) => ({
          id: `sub-${s.id}`,
          title: s.title,
          start: s.scheduledStart!,
          end: s.scheduledEnd ?? undefined,
          backgroundColor: s.status === "done" ? "rgba(100,116,139,0.4)" : `${task.color}cc`,
          borderColor: "transparent",
          textColor: "#ffffff",
          extendedProps: { kind: "subtask", subtaskId: s.id, status: s.status, taskTitle: task.title },
        }))
    ),
  ];

  async function handleEventClick(info: Parameters<NonNullable<React.ComponentProps<typeof FullCalendar>["eventClick"]>>[0]) {
    const props = info.event.extendedProps as { kind: string; subtaskId?: string; status?: string };
    if (props.kind === "subtask" && props.subtaskId) {
      const next = props.status === "done" ? "pending" : "done";
      await fetch(`/api/subtasks/${props.subtaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      fetchData(fromISO, toISO);
      onSubtaskToggled?.();
    }
  }

  const isToday = new Date().toDateString() === currentDate.toDateString();
  const headerLabel =
    view === "week"
      ? `${format(new Date(`${range.from}T12:00:00+09:00`), "M/d", { locale: ja })} 〜 ${format(new Date(`${range.to}T12:00:00+09:00`), "M/d", { locale: ja })}`
      : format(currentDate, "M月d日 (E)", { locale: ja });

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden"
      style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1 px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          onClick={() => navigate(1)}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span
          className="font-medium text-sm ml-1"
          style={{ color: isToday && view === "day" ? "var(--accent-cyan)" : "var(--text-primary)" }}
        >
          {headerLabel}
          {isToday && view === "day" && (
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--accent-cyan)", opacity: 0.7 }}>
              今日
            </span>
          )}
        </span>

        {!isToday && (
          <button
            className="ml-2 text-xs px-2.5 py-1 rounded-lg transition-all"
            style={{
              background: "var(--glass-bg-hover)",
              color: "var(--text-secondary)",
              border: "1px solid var(--glass-border)",
            }}
            onClick={() => navigate(0)}
          >
            今日へ
          </button>
        )}

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              className="text-xs px-2.5 py-1 rounded-lg transition-all"
              style={{
                background: view === v ? "var(--accent-cyan-dim)" : "var(--glass-bg-hover)",
                color: view === v ? "var(--accent-cyan)" : "var(--text-secondary)",
                border: view === v ? "1px solid rgba(56,189,248,0.3)" : "1px solid var(--glass-border)",
              }}
              onClick={() => switchView(v)}
            >
              {v === "day" ? "日" : "週"}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-auto">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          initialDate={currentDate}
          timeZone="Asia/Tokyo"
          locale="ja"
          headerToolbar={false}
          dayHeaderFormat={{ weekday: "short", day: "numeric" }}
          events={calendarEvents}
          eventClick={handleEventClick}
          height="100%"
          slotMinTime={`${String(work.start).padStart(2, "0")}:00:00`}
          slotMaxTime={`${String(work.end).padStart(2, "0")}:00:00`}
          allDayText="終日"
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          nowIndicator
        />
      </div>

      <p
        className="text-center text-xs py-1.5 shrink-0"
        style={{ color: "var(--text-muted)", borderTop: "1px solid var(--glass-border)" }}
      >
        タスクブロックをクリックで完了/未完了を切り替え · 「週」で期間全体を表示
      </p>
    </div>
  );
}
