"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CalendarDays, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { EventData, SubTaskData, TaskData } from "@/types";
import dynamic from "next/dynamic";

const MiniCalendar = dynamic(() => import("./MiniCalendar"), { ssr: false });

export default function Dashboard() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [subtasks, setSubtasks] = useState<(SubTaskData & { taskColor: string; taskTitle: string })[]>([]);
  const [comment, setComment] = useState<string | null>(null);
  const [commentLoading, setCommentLoading] = useState(true);

  const today = new Date();
  const todayStr = format(today, "yyyy年M月d日 (E)", { locale: ja });

  useEffect(() => {
    const from = new Date(today);
    from.setHours(0, 0, 0, 0);
    const to = new Date(today);
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

    fetch("/api/ai/dashboard-comment")
      .then((r) => r.json())
      .then((d) => setComment(d.comment ?? null))
      .catch(() => setComment(null))
      .finally(() => setCommentLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="min-h-screen bg-slate-50">
      {/* グラデーションヘッダー */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-1">Dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight">{todayStr}</h1>

          {commentLoading ? (
            <div className="flex items-center gap-2 mt-4 text-sm text-indigo-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              AIが今日を分析中…
            </div>
          ) : comment ? (
            <div className="flex items-start gap-3 mt-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-sm max-w-2xl border border-white/20">
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-indigo-300" />
              <p className="text-indigo-50 leading-relaxed">{comment}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* 左カラム: 今日の情報 */}
          <div className="lg:col-span-2 space-y-5">

            {/* 今日の予定 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="font-semibold text-slate-700">今日の予定</h2>
                <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {events.length}件
                </span>
              </div>
              {events.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <CalendarDays className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">予定はありません</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((e) => (
                    <div
                      key={e.id}
                      className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div
                        className="w-1.5 h-12 rounded-full shrink-0"
                        style={{ backgroundColor: e.color }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">{e.title}</p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(e.start), "HH:mm")} – {format(new Date(e.end), "HH:mm")}
                          {e.location && ` · ${e.location}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 今日のタスク */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <ListTodo className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="font-semibold text-slate-700">今日のタスク</h2>
                <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {subtasks.length}件
                </span>
              </div>
              {subtasks.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <ListTodo className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">今日スケジュールされたタスクはありません</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {subtasks.map((s) => (
                    <div
                      key={s.id}
                      className={`bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3 cursor-pointer shadow-sm hover:shadow-md transition-all ${
                        s.status === "done" ? "opacity-50" : ""
                      }`}
                      onClick={() => toggleSubtask(s.id, s.status)}
                    >
                      <div
                        className="w-1.5 h-12 rounded-full shrink-0"
                        style={{ backgroundColor: s.taskColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm truncate ${
                            s.status === "done" ? "line-through text-slate-400" : "text-slate-800"
                          }`}
                        >
                          {s.title}
                        </p>
                        <p className="text-xs text-slate-400">{s.taskTitle}</p>
                      </div>
                      {s.estimatedHours && (
                        <Badge variant="outline" className="text-xs shrink-0 border-slate-200">
                          {s.estimatedHours}h
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右カラム: カレンダー */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
              </div>
              <h2 className="font-semibold text-slate-700">カレンダー</h2>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-3">
              <MiniCalendar />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
