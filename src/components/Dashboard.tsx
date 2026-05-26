"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { EventData, SubTaskData, TaskData } from "@/types";

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
            .map((s) => ({
              ...s,
              taskColor: t.color,
              taskTitle: t.title,
            }))
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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{todayStr}</h1>

        {commentLoading ? (
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            AIコメントを生成中…
          </div>
        ) : comment ? (
          <div className="flex items-start gap-2 mt-2 bg-indigo-50 text-indigo-800 rounded-lg px-3 py-2 text-sm">
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
            <p>{comment}</p>
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="font-semibold text-gray-700 mb-2">
          今日の予定 ({events.length}件)
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">予定はありません</p>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <Card key={e.id} className="p-3 flex items-center gap-3">
                <div
                  className="w-1 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: e.color }}
                />
                <div>
                  <p className="font-medium text-sm">{e.title}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(e.start), "HH:mm")} -{" "}
                    {format(new Date(e.end), "HH:mm")}
                    {e.location && ` · ${e.location}`}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold text-gray-700 mb-2">
          今日のタスク ({subtasks.length}件)
        </h2>
        {subtasks.length === 0 ? (
          <p className="text-sm text-gray-400">今日スケジュールされたタスクはありません</p>
        ) : (
          <div className="space-y-2">
            {subtasks.map((s) => (
              <Card
                key={s.id}
                className={`p-3 flex items-center gap-3 cursor-pointer transition-opacity ${
                  s.status === "done" ? "opacity-50" : ""
                }`}
                onClick={() => toggleSubtask(s.id, s.status)}
              >
                <div
                  className="w-1 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: s.taskColor }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium text-sm truncate ${
                      s.status === "done" ? "line-through text-gray-400" : ""
                    }`}
                  >
                    {s.title}
                  </p>
                  <p className="text-xs text-gray-400">{s.taskTitle}</p>
                </div>
                {s.estimatedHours && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {s.estimatedHours}h
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
