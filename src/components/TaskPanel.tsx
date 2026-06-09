"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, Plus, RefreshCw, CheckCircle2, Circle,
  Clock, CalendarDays, ChevronRight, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { TaskData } from "@/types";
import TaskModal from "./TaskModal";

interface Props {
  refresh?: number;
  onTaskChange?: () => void;
}

const PRIORITY_LABEL: Record<string, string> = { low: "低", medium: "中", high: "高" };
const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-amber-100 text-amber-600",
  high: "bg-red-100 text-red-500",
};

export default function TaskPanel({ refresh, onTaskChange }: Props) {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskData | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [defaultDeadline, setDefaultDeadline] = useState<string | undefined>();
  // タスク追加後のAIスケジューリング
  const [scheduling, setScheduling] = useState(false);

  async function fetchTasks() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }

  useEffect(() => {
    fetchTasks();
  }, [refresh]);

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null;

  async function toggleSubtask(subtaskId: string, current: string) {
    const next = current === "done" ? "pending" : "done";
    await fetch(`/api/subtasks/${subtaskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    fetchTasks();
    onTaskChange?.();
  }

  async function replan(taskId: string) {
    setPlanningId(taskId);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) throw new Error();
      toast.success("スケジュールを更新しました");
      fetchTasks();
      onTaskChange?.();
    } catch {
      toast.error("スケジュール更新に失敗しました");
    } finally {
      setPlanningId(null);
    }
  }

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
      if (!bdRes.ok) { await fetchTasks(); return; }
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
      toast.success("タスクをスケジュールしました");
      fetchTasks();
      onTaskChange?.();
      setSelectedId(newTask.id);
    } catch {
      toast.error("スケジューリングに失敗しました（タスクは保存済み）");
      fetchTasks();
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* ── タスク一覧 ── */}
      <div className="flex flex-col min-h-0 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden"
           style={{ flex: selectedTask ? "0 0 40%" : "1" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-700 text-sm">タスク一覧</h2>
          <Button
            size="sm"
            className="h-7 text-xs bg-violet-600 hover:bg-violet-700"
            onClick={() => {
              setEditTask(null);
              setDefaultDeadline(undefined);
              setModalOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />追加
          </Button>
        </div>

        {scheduling && (
          <div className="flex items-center gap-2 mx-3 mt-2 px-3 py-2 bg-indigo-50 rounded-lg text-xs text-indigo-700 shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />AIがスケジュール中…
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">タスクがありません</p>
          ) : (
            tasks.map((task) => {
              const total = task.subtasks?.length ?? 0;
              const done = task.subtasks?.filter((s) => s.status === "done").length ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isSelected = task.id === selectedId;

              return (
                <button
                  key={task.id}
                  className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-50 ${isSelected ? "bg-indigo-50" : ""}`}
                  onClick={() => setSelectedId(isSelected ? null : task.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                    <span className="font-medium text-sm text-slate-800 flex-1 truncate">{task.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${PRIORITY_COLOR[task.priority]}`}>
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-300 shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                  </div>
                  <div className="flex items-center gap-2 ml-4.5 text-xs text-slate-400">
                    <CalendarDays className="w-3 h-3" />
                    {format(new Date(task.deadline), "M/d", { locale: ja })}
                    {task.estimatedHours && (
                      <>
                        <Clock className="w-3 h-3 ml-1" />{task.estimatedHours}h
                      </>
                    )}
                    <span className="ml-auto">{done}/{total} 完了</span>
                  </div>
                  {total > 0 && (
                    <div className="ml-4 mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: task.color }}
                      />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── タスク詳細 ── */}
      {selectedTask && (
        <div className="flex flex-col min-h-0 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex-1">
          {/* 詳細ヘッダー */}
          <div className="px-4 py-3 border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedTask.color }} />
                <h3 className="font-semibold text-slate-800 text-sm truncate">{selectedTask.title}</h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="AI再スケジュール"
                  disabled={planningId === selectedTask.id}
                  onClick={() => replan(selectedTask.id)}
                >
                  {planningId === selectedTask.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  title="タスクを編集"
                  onClick={() => { setEditTask(selectedTask); setModalOpen(true); }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 ml-5">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                期日: {format(new Date(selectedTask.deadline), "yyyy年M月d日", { locale: ja })}
              </span>
              {selectedTask.estimatedHours && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedTask.estimatedHours}h
                </span>
              )}
            </div>
            {selectedTask.description && (
              <p className="mt-1.5 ml-5 text-xs text-slate-500 leading-relaxed">{selectedTask.description}</p>
            )}
          </div>

          {/* サブタスク一覧 */}
          <div className="flex-1 overflow-y-auto">
            {(selectedTask.subtasks?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                <p>サブタスクがありません</p>
                <p className="text-xs mt-1">AI再スケジュールでサブタスクを生成できます</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {(selectedTask.subtasks ?? [])
                  .sort((a, b) => a.order - b.order)
                  .map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                      onClick={() => toggleSubtask(s.id, s.status)}
                    >
                      {s.status === "done"
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        : <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${s.status === "done" ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {s.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          {s.estimatedHours && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />{s.estimatedHours}h
                            </span>
                          )}
                          {s.scheduledStart && (
                            <span className="flex items-center gap-0.5">
                              <CalendarDays className="w-3 h-3" />
                              {format(new Date(s.scheduledStart), "M/d HH:mm")}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={editTask}
        defaultDeadline={defaultDeadline}
        onSaved={(newTask) => {
          setModalOpen(false);
          if (newTask && !editTask) {
            scheduleNewTask(newTask);
          } else {
            fetchTasks();
            onTaskChange?.();
          }
        }}
      />
    </div>
  );
}
