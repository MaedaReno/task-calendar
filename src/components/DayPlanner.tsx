"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { EventData, TaskData } from "@/types";

interface Props {
  refresh?: number;
  onSubtaskToggled?: () => void;
}

export default function DayPlanner({ refresh, onSubtaskToggled }: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<EventData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);

  const fetchData = useCallback(async (date: Date) => {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    const [evRes, taskRes] = await Promise.all([
      fetch(`/api/events?from=${from.toISOString()}&to=${to.toISOString()}`),
      fetch("/api/tasks"),
    ]);
    if (evRes.ok) setEvents(await evRes.json());
    if (taskRes.ok) setTasks(await taskRes.json());
  }, []);

  useEffect(() => {
    fetchData(currentDate);
  }, [currentDate, fetchData, refresh]);

  function navigate(dir: -1 | 0 | 1) {
    const d = new Date(currentDate);
    if (dir === 0) {
      d.setTime(Date.now());
    } else {
      d.setDate(d.getDate() + dir);
    }
    setCurrentDate(d);
    calendarRef.current?.getApi().gotoDate(d);
  }

  function isOnCurrentDay(utcStr: string): boolean {
    const jstMs = new Date(utcStr).getTime() + 9 * 60 * 60 * 1000;
    const dayMs = new Date(currentDate).getTime() + 9 * 60 * 60 * 1000;
    return new Date(jstMs).toISOString().slice(0, 10) ===
           new Date(dayMs).toISOString().slice(0, 10);
  }

  const calendarEvents = [
    ...events.map((e) => {
      if (e.allDay) {
        const jst = new Date(new Date(e.start).getTime() + 9 * 60 * 60 * 1000);
        return {
          id: `ev-${e.id}`,
          title: e.title,
          start: jst.toISOString().slice(0, 10),
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
        .filter((s) => s.scheduledStart && isOnCurrentDay(s.scheduledStart))
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
      fetchData(currentDate);
      onSubtaskToggled?.();
    }
  }

  const isToday = new Date().toDateString() === currentDate.toDateString();

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
          style={{ color: isToday ? "var(--accent-cyan)" : "var(--text-primary)" }}
        >
          {format(currentDate, "M月d日 (E)", { locale: ja })}
          {isToday && (
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--accent-cyan)", opacity: 0.7 }}>
              今日
            </span>
          )}
        </span>

        {!isToday && (
          <button
            className="ml-auto text-xs px-2.5 py-1 rounded-lg transition-all"
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

        {/* Legend */}
        <div
          className="flex items-center gap-3 ml-auto text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--accent-cyan)" }} />
            予定
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--accent-violet)" }} />
            タスク
          </span>
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
          events={calendarEvents}
          eventClick={handleEventClick}
          height="100%"
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
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
        タスクブロックをクリックで完了/未完了を切り替え
      </p>
    </div>
  );
}
