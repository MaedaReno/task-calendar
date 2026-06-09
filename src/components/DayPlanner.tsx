"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // UTC日時文字列がcurrentDate（JST）と同じ日かを判定
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
          borderColor: e.color,
          extendedProps: { kind: "event" },
        };
      }
      return {
        id: `ev-${e.id}`,
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: e.color,
        borderColor: e.color,
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
          backgroundColor: s.status === "done" ? "#d1d5db" : `${task.color}dd`,
          borderColor: task.color,
          textColor: "#1e293b",
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
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-slate-100 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <span className={`font-semibold text-sm ml-1 ${isToday ? "text-indigo-600" : "text-slate-800"}`}>
          {format(currentDate, "M月d日 (E)", { locale: ja })}
          {isToday && <span className="ml-2 text-xs font-normal text-indigo-400">今日</span>}
        </span>
        {!isToday && (
          <Button variant="outline" size="sm" className="ml-auto h-7 text-xs px-2" onClick={() => navigate(0)}>
            今日へ
          </Button>
        )}
        {/* 凡例 */}
        <div className="flex items-center gap-3 ml-auto text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-indigo-500" />予定
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-violet-400" />タスク
          </span>
        </div>
      </div>

      {/* カレンダー本体 */}
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
      <p className="text-center text-xs text-slate-300 py-1.5 shrink-0">
        タスクブロックをクリックで完了/未完了を切り替え
      </p>
    </div>
  );
}
