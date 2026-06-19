"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { TaskData } from "@/types";
import TaskModal from "./TaskModal";

const PRIORITY_LABEL: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "secondary",
  medium: "outline",
  high: "destructive",
};

export default function TaskList() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [planningId, setPlanningId] = useState<string | null>(null);

  async function fetchTasks() {
    const res = await fetch("/api/tasks");
    if (res.ok) setTasks(await res.json());
  }

  useEffect(() => {
    fetchTasks();
  }, []);

  async function replan(taskId: string) {
    setPlanningId(taskId);
    try {
      const res = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const n = data?.unplaced?.length ?? 0;
      if (n > 0) {
        toast.warning(`${n}件のサブタスクは締切までに収まりませんでした。締切や見積り時間を見直してください`);
      } else {
        toast.success("実行計画を更新しました");
      }
      fetchTasks();
    } catch {
      toast.error("実行計画の生成に失敗しました");
    } finally {
      setPlanningId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">タスク一覧</h2>
        <Button
          size="sm"
          onClick={() => {
            setSelectedTask(null);
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          追加
        </Button>
      </div>

      {tasks.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          タスクがありません
        </p>
      )}

      {tasks.map((task) => {
        const total = task.subtasks?.length ?? 0;
        const done = task.subtasks?.filter((s) => s.status === "done").length ?? 0;
        const progress = total > 0 ? (done / total) * 100 : 0;

        return (
          <Card key={task.id} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => {
                  setSelectedTask(task);
                  setModalOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: task.color }}
                  />
                  <p className="font-medium text-sm">{task.title}</p>
                  <Badge
                    variant={
                      PRIORITY_COLOR[task.priority] as
                        | "secondary"
                        | "outline"
                        | "destructive"
                    }
                    className="text-xs"
                  >
                    {PRIORITY_LABEL[task.priority]}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 ml-5 mt-0.5">
                  期日: {new Date(task.deadline).toLocaleDateString("ja-JP")}
                  {task.estimatedHours && ` · ${task.estimatedHours}h`}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 w-7 h-7"
                onClick={() => replan(task.id)}
                disabled={planningId === task.id}
                title="AIで再スケジュール"
              >
                {planningId === task.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>

            {total > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{done}/{total} 完了</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: task.color,
                    }}
                  />
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={selectedTask}
        onSaved={() => {
          setModalOpen(false);
          fetchTasks();
        }}
      />
    </div>
  );
}
