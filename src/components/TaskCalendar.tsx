"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { TaskData } from "@/types";
import TaskModal from "./TaskModal";

export default function TaskCalendar() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultDeadline, setDefaultDeadline] = useState<string | undefined>();
  const [scheduling, setScheduling] = useState(false);

  async function fetchTasks() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  // 新規タスク作成後にAI breakdown + plan を自動実行
  async function scheduleNewTask(newTask: TaskData) {
    setScheduling(true);
    try {
      const bdRes = await fetch("/api/ai/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: newTask.id,
          taskTitle: newTask.title,
          taskDescription: newTask.description ?? "",
          deadline: newTask.deadline,
          estimatedHours: newTask.estimatedHours,
        }),
      });
      if (!bdRes.ok) {
        await fetchTasks();
        return;
      }
      const subtasks = await bdRes.json();

      for (let i = 0; i < subtasks.length; i++) {
        await fetch("/api/subtasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: newTask.id,
            title: subtasks[i].title,
            estimatedHours: subtasks[i].estimatedHours,
            order: i,
          }),
        });
      }

      await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: newTask.id }),
      });

      await fetchTasks();
      toast.success("タスクをカレンダーにスケジュールしました");
    } catch {
      toast.error("スケジューリングに失敗しました（タスクは保存済み）");
      await fetchTasks();
    } finally {
      setScheduling(false);
    }
  }

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
      {scheduling && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-indigo-50 rounded-lg text-sm text-indigo-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          AIがタスクをスケジュール中…
        </div>
      )}
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
        dateClick={(info) => {
          setDefaultDeadline(`${info.dateStr}T23:59`);
          setModalOpen(true);
        }}
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
          const nextStatus = subtask.status === "done" ? "pending" : "done";
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
        日付クリックでタスク追加・イベントクリックで完了切り替え・ドラッグで再スケジュール
      </p>
      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDeadline={defaultDeadline}
        onSaved={(newTask) => {
          setModalOpen(false);
          if (newTask) {
            scheduleNewTask(newTask);
          } else {
            fetchTasks();
          }
        }}
      />
    </div>
  );
}
