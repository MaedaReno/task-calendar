"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, CalendarDays, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { EventData, SubTaskData, TaskData } from "@/types";
import dynamic from "next/dynamic";
import AIInputPanel from "./AIInputPanel";

const ScheduleCalendar = dynamic(() => import("./ScheduleCalendar"), { ssr: false });
const TaskCalendar = dynamic(() => import("./TaskCalendar"), { ssr: false });

type CalendarView = "schedule" | "task";

export default function Dashboard() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [subtasks, setSubtasks] = useState<(SubTaskData & { taskColor: string; taskTitle: string })[]>([]);
  const [comment, setComment] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(true);
  const [calendarView, setCalendarView] = useState<CalendarView>("schedule");
  const [refresh, setRefresh] = useState(0);

  const today = new Date();
  const todayStr = format(today, "yyyy年M月d日 (E)", { locale: ja });

  useEffect(() => {
    fetch("/api/ai/dashboard-comment")
      .then((r) => r.json())
      .then((d) => setComment(d.comment ?? null))
      .catch(() => setComment(null))
      .finally(() => setCommentLoading(false));
  }, []);

  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);

    fetch(`/api/events?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => {});

    fetch("/api/tasks")
      .then((r) => r.json())
      .then((tasks: TaskData[]) => {
        const todaySubtasks = tasks.flatMap((t) =>
          (t.subtasks ?? [])
            .filter((s) => {
              if (!s.scheduledStart) return false;
              const d = new Date(s.scheduledStart);
              return d >= from && d <= to && s.status !== "done";
            })
            .map((s) => ({ ...s, taskColor: t.color, taskTitle: t.title }))
        );
        setSubtasks(todaySubtasks);
      })
      .catch(() => {});
  }, [refresh]);

  async function toggleSubtask(id: string, current: string) {
    const next = current === "done" ? "pending" : "done";
    await fetch(`/api/subtasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: next as "pending" | "in_progress" | "done" } : s))
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden">
        {/* Glow orbs */}
        <div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "var(--accent-cyan)" }}
        />
        <div
          className="absolute -top-10 right-10 w-60 h-60 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "var(--accent-violet)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Label */}
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--accent-cyan)" }}
          >
            Dashboard
          </p>

          {/* Date */}
          <h1
            className="text-3xl sm:text-4xl font-light tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {todayStr}
          </h1>

          {/* AI comment */}
          {commentLoading ? (
            <div
              className="flex items-center gap-2 mt-4 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AIが今日を分析中…
            </div>
          ) : comment ? (
            <div
              className="flex items-start gap-3 mt-4 max-w-2xl rounded-xl px-4 py-3 text-sm"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "blur(12px)",
              }}
            >
              <Sparkles
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "var(--accent-cyan)" }}
              />
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>{comment}</p>
            </div>
          ) : null}
        </div>

        {/* Bottom border */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--glass-border), transparent)" }}
        />
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Left column: AI input + today info */}
          <div className="lg:col-span-2 space-y-4">

            {/* AI Input Panel */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))" }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <h2 className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                  AI 入力
                </h2>
              </div>
              <AIInputPanel onApproved={() => setRefresh((n) => n + 1)} />
            </div>

            {/* Today's Events */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent-cyan-dim)", border: "1px solid rgba(56,189,248,0.2)" }}
                >
                  <CalendarDays className="w-4 h-4" style={{ color: "var(--accent-cyan)" }} />
                </div>
                <h2 className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                  今日の予定
                </h2>
                <span
                  className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "var(--glass-bg)", color: "var(--text-muted)", border: "1px solid var(--glass-border)" }}
                >
                  {events.length}件
                </span>
              </div>

              {events.length === 0 ? (
                <div
                  className="text-center py-8 rounded-2xl"
                  style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
                >
                  <CalendarDays className="w-7 h-7 mx-auto mb-2 opacity-20" style={{ color: "var(--text-secondary)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>予定はありません</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-xl p-3 flex items-center gap-3 transition-all duration-150"
                      style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
                      onMouseEnter={(el) => { (el.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)"; }}
                      onMouseLeave={(el) => { (el.currentTarget as HTMLElement).style.background = "var(--glass-bg)"; }}
                    >
                      <div
                        className="w-0.5 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: e.color }}
                      />
                      <div className="min-w-0">
                        <p
                          className="font-medium text-sm truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {e.title}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {format(new Date(e.start), "HH:mm")} – {format(new Date(e.end), "HH:mm")}
                          {e.location && ` · ${e.location}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Tasks */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent-violet-dim)", border: "1px solid rgba(167,139,250,0.2)" }}
                >
                  <ListTodo className="w-4 h-4" style={{ color: "var(--accent-violet)" }} />
                </div>
                <h2 className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                  今日のタスク
                </h2>
                <span
                  className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "var(--glass-bg)", color: "var(--text-muted)", border: "1px solid var(--glass-border)" }}
                >
                  {subtasks.length}件
                </span>
              </div>

              {subtasks.length === 0 ? (
                <div
                  className="text-center py-8 rounded-2xl"
                  style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
                >
                  <ListTodo className="w-7 h-7 mx-auto mb-2 opacity-20" style={{ color: "var(--text-secondary)" }} />
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    今日スケジュールされたタスクはありません
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {subtasks.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all duration-150"
                      style={{
                        background: "var(--glass-bg)",
                        border: "1px solid var(--glass-border)",
                        opacity: s.status === "done" ? 0.45 : 1,
                      }}
                      onClick={() => toggleSubtask(s.id, s.status)}
                      onMouseEnter={(el) => { (el.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)"; }}
                      onMouseLeave={(el) => { (el.currentTarget as HTMLElement).style.background = "var(--glass-bg)"; }}
                    >
                      <div
                        className="w-0.5 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: s.taskColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-medium text-sm truncate"
                          style={{
                            color: s.status === "done" ? "var(--text-muted)" : "var(--text-primary)",
                            textDecoration: s.status === "done" ? "line-through" : "none",
                          }}
                        >
                          {s.title}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.taskTitle}</p>
                      </div>
                      {s.estimatedHours && (
                        <span
                          className="text-xs shrink-0 px-1.5 py-0.5 rounded-md"
                          style={{ background: "var(--glass-bg-active)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                        >
                          {s.estimatedHours}h
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right column: Calendar */}
          <div className="lg:col-span-3 space-y-3">

            {/* Calendar tab switcher */}
            <div
              className="rounded-2xl flex overflow-hidden p-1 gap-1"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
            >
              <button
                onClick={() => setCalendarView("schedule")}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl transition-all duration-150"
                style={
                  calendarView === "schedule"
                    ? {
                        background: "var(--accent-cyan-dim)",
                        color: "var(--accent-cyan)",
                        border: "1px solid rgba(56,189,248,0.2)",
                      }
                    : {
                        color: "var(--text-muted)",
                        border: "1px solid transparent",
                      }
                }
              >
                <CalendarDays className="w-3.5 h-3.5" />
                予定カレンダー
              </button>
              <button
                onClick={() => setCalendarView("task")}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl transition-all duration-150"
                style={
                  calendarView === "task"
                    ? {
                        background: "var(--accent-violet-dim)",
                        color: "var(--accent-violet)",
                        border: "1px solid rgba(167,139,250,0.2)",
                      }
                    : {
                        color: "var(--text-muted)",
                        border: "1px solid transparent",
                      }
                }
              >
                <ListTodo className="w-3.5 h-3.5" />
                タスクカレンダー
              </button>
            </div>

            {/* Calendar body */}
            {calendarView === "schedule"
              ? <ScheduleCalendar key={`schedule-${refresh}`} />
              : <TaskCalendar key={`task-${refresh}`} />
            }

          </div>

        </div>
      </div>
    </div>
  );
}
