"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import type { AIExtractedTask } from "@/types";
import VoiceInputButton from "./VoiceInputButton";

interface Props {
  onApproved: () => void;
}

export default function AIInputPanel({ onApproved }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<AIExtractedTask[]>([]);
  const [approving, setApproving] = useState(false);

  async function extract() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExtracted(data);
    } catch {
      toast.error("タスクの抽出に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    setApproving(true);
    let successCount = 0;
    for (const task of extracted) {
      try {
        // 1. タスク作成
        const taskRes = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            deadline: task.suggestedDeadline,
            estimatedHours: task.estimatedHours,
          }),
        });
        if (!taskRes.ok) continue;
        const createdTask = await taskRes.json();

        // 2. サブタスク分解
        const bdRes = await fetch("/api/ai/breakdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: createdTask.id,
            taskTitle: task.title,
            taskDescription: task.description,
            deadline: task.suggestedDeadline,
            estimatedHours: task.estimatedHours,
          }),
        });
        if (!bdRes.ok) {
          successCount++;
          continue; // タスクは作成済み、サブタスクなしで続行
        }
        const subtasks = await bdRes.json();

        // 3. サブタスクをDBに保存
        for (let i = 0; i < subtasks.length; i++) {
          await fetch("/api/subtasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              taskId: createdTask.id,
              title: subtasks[i].title,
              estimatedHours: subtasks[i].estimatedHours,
              order: i,
            }),
          });
        }

        // 4. 実行計画生成
        await fetch("/api/ai/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: createdTask.id }),
        });

        successCount++;
      } catch {
        // 部分失敗は継続
      }
    }

    setApproving(false);
    if (successCount > 0) {
      toast.success(`${successCount}件のタスクをスケジュールに追加しました`);
      setExtracted([]);
      setInput("");
      onApproved();
    } else {
      toast.error("タスクの追加に失敗しました");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          placeholder="例: 来月のゼミ発表に向けて準備する、レポートを書く、など…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          className="flex-1"
        />
        <div className="flex flex-col gap-2">
          <VoiceInputButton onResult={(t) => setInput((prev) => prev + t)} />
          <Button
            onClick={extract}
            disabled={loading || !input.trim()}
            size="icon"
            title="AIで抽出"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {extracted.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            抽出されたタスク ({extracted.length}件)
          </p>
          {extracted.map((task, i) => (
            <Card key={i} className="p-3 space-y-1">
              <div className="flex items-start justify-between">
                <p className="font-medium text-sm">{task.title}</p>
                <Badge variant="outline" className="text-xs shrink-0 ml-2">
                  {task.estimatedHours}h
                </Badge>
              </div>
              <p className="text-xs text-gray-500">{task.description}</p>
              <p className="text-xs text-gray-400">
                期日: {new Date(task.suggestedDeadline).toLocaleDateString("ja-JP")}
              </p>
            </Card>
          ))}
          <Button
            onClick={approve}
            disabled={approving}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {approving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />スケジューリング中…</>
            ) : (
              <><Check className="w-4 h-4 mr-2" />承認してタスクカレンダーに追加</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
