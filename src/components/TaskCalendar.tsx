"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { toast } from "sonner";
import type { TaskData } from "@/types";

export default function TaskCalendar() {
  const [tasks, setTasks] = useState<TaskData[]>([]);

  async function fetchTasks() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  const calendarEvents = tasks.flatMap((task) =>
    (task.subtasks ?? [])
      .filter((s) => s.scheduledStart && s.scheduledEnd)
      .map((s) => ({
        id: s.id,
        title: `[${task.title}] ${s.title}`,
        start: s.scheduledStart!,
        end: s.scheduledEnd!,
        backgroundColor: s.status === "done" ? "#9ca3af" : task.color,
        borderColor: s.status === "done" ? "#9ca3af" : task.color,
        opacity: s.status === "done" ? 0.5 : 1,
        extendedProps: { subtask: s, task },
      }))
  );

  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        timeZone="Asia/Tokyo"
        locale="ja"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        buttonText={{ today: "今日", month: "月", week: "週", day: "日" }}
        events={calendarEvents}
        editable
        eventDrop={async (info) => {
          const ev = info.event;
          const res = await fetch(`/api/subtasks/${ev.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduledStart: ev.start?.toISOString(),
              scheduledEnd: ev.end?.toISOString(),
            }),
          });
          if (!res.ok) {
            info.revert();
            toast.error("スケジュールの更新に失敗しました");
          } else {
            fetchTasks();
          }
        }}
        eventResize={async (info) => {
          const ev = info.event;
          const res = await fetch(`/api/subtasks/${ev.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduledStart: ev.start?.toISOString(),
              scheduledEnd: ev.end?.toISOString(),
            }),
          });
          if (!res.ok) {
            info.revert();
            toast.error("スケジュールの更新に失敗しました");
          } else {
            fetchTasks();
          }
        }}
        eventClick={(info) => {
          const { subtask } = info.event.extendedProps as {
            subtask: { id: string; status: string };
            task: TaskData;
          };
          const nextStatus =
            subtask.status === "done" ? "pending" : "done";
          fetch(`/api/subtasks/${subtask.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
          }).then(() => fetchTasks());
        }}
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
      />
      <p className="text-xs text-gray-400 mt-2 text-center">
        クリックで完了/未完了を切り替え・ドラッグで再スケジュール
      </p>
    </div>
  );
}
