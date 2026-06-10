"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
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
        dateClick={(info) => {
          setDefaultDeadline(`${info.dateStr}T23:59`);
          setModalOpen(true);
        }}
        eventClick={(info) => {
          const task = info.event.extendedProps.task as TaskData;
          void task;
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
