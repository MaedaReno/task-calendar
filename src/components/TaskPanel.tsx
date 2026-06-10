"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Plus, RefreshCw, CheckCircle2, Circle,
  Clock, CalendarDays, ChevronRight, Pencil, Scissors,
} from "lucide-react";
import TaskBreakdownDialog from "./TaskBreakdownDialog";
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
const PRIORITY_STYLE: Record<string, { background: string; color: string }> = {
  low: { background: "rgba(100,116,139,0.15)", color: "#64748b" },
  medium: { background: "rgba(251,191,36,0.15)", color: "#f59e0b" },
  high: { background: "rgba(239,68,68,0.15)", color: "#ef4444" },
};

export default function TaskPanel({ refresh, onTaskChange }: Props) {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskData | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [defaultDeadline, setDefaultDeadline] = useState<string | undefined>();
  const [breakdownTaskId, setBreakdownTaskId] = useState<string | null>(null);

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


  return (
    <div className="flex flex-col h-full gap-3">
      {/* Task list */}
      <div
        className="flex flex-col min-h-0 rounded-2xl overflow-hidden"
        style={{
          flex: selectedTask ? "0 0 40%" : "1",
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <h2 className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
            タスク一覧
          </h2>
          <button
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: "var(--accent-violet-dim)",
              color: "var(--accent-violet)",
              border: "1px solid rgba(167,139,250,0.25)",
            }}
            onClick={() => {
              setEditTask(null);
              setDefaultDeadline(undefined);
              setModalOpen(true);
            }}
          >
            <Plus className="w-3 h-3" />追加
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: "var(--text-muted)" }}>
              タスクがありません
            </p>
          ) : (
            tasks.map((task) => {
              const total = task.subtasks?.length ?? 0;
              const done = task.subtasks?.filter((s) => s.status === "done").length ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isSelected = task.id === selectedId;

              return (
                <button
                  key={task.id}
                  className="w-full text-left px-4 py-3 transition-all"
                  style={{
                    borderBottom: "1px solid var(--glass-border)",
                    background: isSelected ? "var(--accent-violet-dim)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                  onClick={() => setSelectedId(isSelected ? null : task.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                    <span className="font-medium text-sm flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                      {task.title}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md font-medium shrink-0"
                      style={PRIORITY_STYLE[task.priority]}
                    >
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                    <button
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg shrink-0 transition-all"
                      style={{
                        background: "var(--accent-cyan-dim)",
                        color: "var(--accent-cyan)",
                        border: "1px solid rgba(56,189,248,0.25)",
                      }}
                      title="AIと一緒に細分化"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBreakdownTaskId(task.id);
                      }}
                    >
                      <Scissors className="w-3 h-3" />
                      細分化
                    </button>
                    <ChevronRight
                      className="w-3.5 h-3.5 shrink-0 transition-transform"
                      style={{ color: "var(--text-muted)", transform: isSelected ? "rotate(90deg)" : "none" }}
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-4 text-xs" style={{ color: "var(--text-muted)" }}>
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
                    <div
                      className="ml-4 mt-1.5 h-0.5 rounded-full overflow-hidden"
                      style={{ background: "var(--glass-border)" }}
                    >
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

      {/* Task detail */}
      {selectedTask && (
        <div
          className="flex flex-col min-h-0 rounded-2xl overflow-hidden flex-1"
          style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
        >
          <div
            className="px-4 py-3 shrink-0"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedTask.color }} />
                <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {selectedTask.title}
                </h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                  style={{ color: "var(--text-muted)" }}
                  title="AI再スケジュール"
                  disabled={planningId === selectedTask.id}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  onClick={() => replan(selectedTask.id)}
                >
                  {planningId === selectedTask.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
                <button
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  title="タスクを編集"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  onClick={() => { setEditTask(selectedTask); setModalOpen(true); }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs ml-5" style={{ color: "var(--text-muted)" }}>
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
              <p className="mt-1.5 ml-5 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {selectedTask.description}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {(selectedTask.subtasks?.length ?? 0) === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
                <p>サブタスクがありません</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                  AI再スケジュールでサブタスクを生成できます
                </p>
              </div>
            ) : (
              <div>
                {(selectedTask.subtasks ?? [])
                  .sort((a, b) => a.order - b.order)
                  .map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors"
                      style={{ borderBottom: "1px solid var(--glass-border)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      onClick={() => toggleSubtask(s.id, s.status)}
                    >
                      {s.status === "done"
                        ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--accent-emerald)" }} />
                        : <Circle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }} />
                      }
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm leading-snug"
                          style={{
                            color: s.status === "done" ? "var(--text-muted)" : "var(--text-primary)",
                            textDecoration: s.status === "done" ? "line-through" : "none",
                          }}
                        >
                          {s.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
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
          fetchTasks();
          onTaskChange?.();
          if (newTask && !editTask) {
            setSelectedId(newTask.id);
          }
        }}
      />

      {breakdownTaskId && (() => {
        const t = tasks.find((x) => x.id === breakdownTaskId);
        return t ? (
          <TaskBreakdownDialog
            task={t}
            onClose={() => setBreakdownTaskId(null)}
            onApproved={() => {
              setBreakdownTaskId(null);
              fetchTasks();
              onTaskChange?.();
            }}
          />
        ) : null;
      })()}
    </div>
  );
}
