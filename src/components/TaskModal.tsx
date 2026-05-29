"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { TaskData, TaskTemplateData } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  task?: TaskData | null;
  defaultDeadline?: string;
  // 新規作成時は TaskData を受け取れる（既存コードとの互換性維持のため optional）
  onSaved: (newTask?: TaskData) => void;
}

const COLORS = [
  { label: "紫", value: "#8b5cf6" },
  { label: "青", value: "#3b82f6" },
  { label: "緑", value: "#10b981" },
  { label: "赤", value: "#ef4444" },
  { label: "橙", value: "#f97316" },
];

export default function TaskModal({ open, onClose, task, defaultDeadline, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const [templates, setTemplates] = useState<TaskTemplateData[]>([]);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setDeadline(task.deadline.slice(0, 16));
      setPriority(task.priority);
      setEstimatedHours(task.estimatedHours?.toString() ?? "");
      setColor(task.color);
    } else {
      setTitle("");
      setDescription("");
      setDeadline(defaultDeadline ?? "");
      setPriority("medium");
      setEstimatedHours("");
      setColor("#8b5cf6");
    }
  }, [task, defaultDeadline, open]);

  function applyTemplate(id: string | null) {
    if (!id) return;
    const tmpl = templates.find((t) => t.id === id);
    if (!tmpl) return;
    setTitle(tmpl.title);
    setDescription(tmpl.description ?? "");
    setEstimatedHours(tmpl.estimatedHours?.toString() ?? "");
  }

  async function save() {
    if (!title || !deadline) {
      toast.error("タイトルと期日は必須です");
      return;
    }
    const body = {
      title,
      description,
      deadline: new Date(deadline).toISOString(),
      priority,
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
      color,
    };
    const res = task
      ? await fetch(`/api/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    if (res.ok) {
      const saved = await res.json();
      toast.success(task ? "タスクを更新しました" : "タスクを追加しました");
      // 新規作成時のみ saved を渡す（呼び出し元でAIスケジューリングに利用可能）
      onSaved(task ? undefined : saved);
    } else {
      toast.error("保存に失敗しました");
    }
  }

  async function deleteTask() {
    if (!task) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("タスクを削除しました");
      onSaved();
    } else {
      toast.error("削除に失敗しました");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "タスクを編集" : "タスクを追加"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!task && templates.length > 0 && (
            <div>
              <Label>テンプレートから作成</Label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="テンプレートを選択…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>タイトル *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>説明</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>期日 *</Label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div>
              <Label>見積時間 (h)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>優先度</Label>
              <Select
                value={priority}
                onValueChange={(v) =>
                  v && setPriority(v as "low" | "medium" | "high")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>カラー</Label>
              <Select value={color} onValueChange={(v) => v && setColor(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: c.value }}
                      />
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          {task && (
            <Button variant="destructive" onClick={deleteTask}>
              削除
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={save}>保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
