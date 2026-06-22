"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import luxon3Plugin from "@fullcalendar/luxon3";
import { toast } from "@/lib/toast";
import type { TaskData } from "@/types";
import TaskModal from "./TaskModal";
import { jstToUTC, utcToJSTDate, todayJST, addDays } from "@/lib/datetime";

export default function TaskCalendar() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultStartDate, setDefaultStartDate] = useState<string | undefined>();
  const [defaultDeadline, setDefaultDeadline] = useState<string | undefined>();

  async function fetchTasks() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  // タスクを「開始日〜期日」の期間バーとして表示。
  // 開始日が無い（旧データ）場合は期日のみの1日バーにする。
  const calendarEvents = tasks
    .filter((task) => task.status !== "done")
    .map((task) => {
      const deadlineStr = utcToJSTDate(task.deadline);
      const startStr = task.startDate ? utcToJSTDate(task.startDate) : deadlineStr;
      return {
        id: task.id,
        title: task.title,
        start: startStr,
        // FullCalendar の end は排他的なので期日の翌日にする
        end: addDays(deadlineStr, 1),
        allDay: true,
        backgroundColor: task.color,
        borderColor: "transparent",
        extendedProps: { task },
      };
    });

  // 期間バーのドラッグ移動・リサイズを期間として保存
  async function updateRange(
    taskId: string,
    startStr: string | null,
    endExclusive: string | null,
    revert: () => void
  ) {
    if (!startStr || !endExclusive) {
      revert();
      return;
    }
    const deadlineStr = addDays(endExclusive, -1);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: jstToUTC(startStr, "00:00"),
        deadline: jstToUTC(deadlineStr, "23:45"),
      }),
    });
    if (!res.ok) {
      revert();
      toast.error("期間の更新に失敗しました");
    } else {
      fetchTasks();
      toast.success("期間を更新しました");
    }
  }

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
        plugins={[dayGridPlugin, interactionPlugin, luxon3Plugin]}
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
        eventStartEditable
        eventDurationEditable
        selectable
        dateClick={(info) => {
          // 単日クリック: 今日〜クリック日を初期期間にする
          setDefaultStartDate(todayJST());
          setDefaultDeadline(`${info.dateStr}T23:45`);
          setModalOpen(true);
        }}
        select={(info) => {
          // 単日選択（クリック相当）は dateClick に委ねる。複数日ドラッグのみ範囲として扱う。
          const startStr = info.startStr.slice(0, 10);
          const endStr = info.endStr.slice(0, 10);
          if (addDays(startStr, 1) >= endStr) return;
          // 範囲選択: 選択範囲を初期期間にする（end は排他的なので前日が期日）
          setDefaultStartDate(startStr);
          setDefaultDeadline(`${addDays(endStr, -1)}T23:45`);
          setModalOpen(true);
        }}
        eventDrop={(info) =>
          updateRange(
            info.event.id,
            info.event.startStr ? info.event.startStr.slice(0, 10) : null,
            info.event.endStr ? info.event.endStr.slice(0, 10) : null,
            info.revert
          )
        }
        eventResize={(info) =>
          updateRange(
            info.event.id,
            info.event.startStr ? info.event.startStr.slice(0, 10) : null,
            info.event.endStr ? info.event.endStr.slice(0, 10) : null,
            info.revert
          )
        }
        height="auto"
      />
      <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
        タスクの期間（開始日〜期日）を表示 · クリック/範囲選択でタスク追加
      </p>
      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultStartDate={defaultStartDate}
        defaultDeadline={defaultDeadline}
        onSaved={() => {
          setModalOpen(false);
          fetchTasks();
        }}
      />
    </div>
  );
}
