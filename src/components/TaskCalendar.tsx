"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { toast } from "sonner";
import type { TaskData } from "@/types";
import TaskModal from "./TaskModal";

export default function TaskCalendar() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultDeadline, setDefaultDeadline] = useState<string | undefined>();

  async function fetchTasks() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  const calendarEvents = tasks
    .filter((task) => task.status !== "done")
    .map((task) => ({
      id: task.id,
      title: task.title,
      start: task.deadline.slice(0, 10),
      allDay: true,
      backgroundColor: task.color,
      borderColor: "transparent",
      extendedProps: { task },
    }));

  return (
    <div
      className="rounded-2xl overflow-hidden p-3"
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(12px)",
      }}
    >
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        timeZone="Asia/Tokyo"
        locale="ja"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth",
        }}
        buttonText={{ today: "今日", month: "月" }}
        events={calendarEvents}
        editable
        eventDurationEditable={false}
        dateClick={(info) => {
          setDefaultDeadline(`${info.dateStr}T23:59`);
          setModalOpen(true);
        }}
        eventDrop={async (info) => {
          const taskId = info.event.id;
          const newDate = info.event.startStr;
          if (!newDate) { info.revert(); return; }
          const res = await fetch(`/api/tasks/${taskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deadline: `${newDate}T23:59:00+09:00` }),
          });
          if (!res.ok) {
            info.revert();
            toast.error("期限の更新に失敗しました");
          } else {
            fetchTasks();
            toast.success("期限を更新しました");
          }
        }}
        height="auto"
      />
      <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
        タスクの期限日を表示 · 日付クリックでタスク追加
      </p>
      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDeadline={defaultDeadline}
        onSaved={() => {
          setModalOpen(false);
          fetchTasks();
        }}
      />
    </div>
  );
}
