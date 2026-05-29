"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, CalendarDays, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { AIExtractedTask } from "@/types";
import VoiceInputButton from "./VoiceInputButton";

interface Props {
  onApproved: () => void;
}

type InputMode = "task" | "event";

interface ExtractedEvent {
  title: string;
  start: string;
  end: string;
  description?: string;
}

export default function AIInputPanel({ onApproved }: Props) {
  const [mode, setMode] = useState<InputMode>("task");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [extracted, setExtracted] = useState<AIExtractedTask[]>([]);
  const [extractedEvent, setExtractedEvent] = useState<ExtractedEvent | null>(null);

  function switchMode(newMode: InputMode) {
    setMode(newMode);
    setInput("");
    setExtracted([]);
    setExtractedEvent(null);
  }

  async function extract() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      if (mode === "task") {
        const res = await fetch("/api/ai/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setExtracted(data);
      } else {
        const res = await fetch("/api/ai/parse-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setExtractedEvent(data);
      }
    } catch {
      toast.error(mode === "task" ? "タスクの抽出に失敗しました" : "予定の解析に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function approveTask() {
    setApproving(true);
    let successCount = 0;
    for (const task of extracted) {
      try {
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
        if (!bdRes.ok) { successCount++; continue; }
        const subtasks = await bdRes.json();

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

  async function approveEvent() {
    if (!extractedEvent) return;
    setApproving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extractedEvent),
      });
      if (!res.ok) throw new Error();
      toast.success("予定を追加しました");
      setExtractedEvent(null);
      setInput("");
      onApproved();
    } catch {
      toast.error("予定の追加に失敗しました");
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* モード切り替えタブ */}
      <div className="flex rounded-lg bg-slate-100 p-1 gap-1">
        <button
          onClick={() => switchMode("task")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
            mode === "task"
              ? "bg-white text-violet-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ListTodo className="w-3.5 h-3.5" />
          タスク追加
        </button>
        <button
          onClick={() => switchMode("event")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
            mode === "event"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          予定追加
        </button>
      </div>

      {/* テキスト入力 */}
      <div className="flex gap-2">
        <Textarea
          placeholder={
            mode === "task"
              ? "例: 来月のゼミ発表に向けて準備する、レポートを書く、など…"
              : "例: 明日14時から会議がある、来週月曜に授業がある、など…"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          className="flex-1 text-sm"
        />
        <div className="flex flex-col gap-2">
          <VoiceInputButton onResult={(t) => setInput((prev) => prev + t)} />
          <Button
            onClick={extract}
            disabled={loading || !input.trim()}
            size="icon"
            title="AIで解析"
            className={mode === "task" ? "bg-violet-600 hover:bg-violet-700" : "bg-indigo-600 hover:bg-indigo-700"}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* タスク抽出結果 */}
      {mode === "task" && extracted.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">抽出されたタスク ({extracted.length}件)</p>
          {extracted.map((task, i) => (
            <Card key={i} className="p-3 space-y-1 border-violet-100">
              <div className="flex items-start justify-between">
                <p className="font-medium text-sm">{task.title}</p>
                <Badge variant="outline" className="text-xs shrink-0 ml-2">{task.estimatedHours}h</Badge>
              </div>
              <p className="text-xs text-slate-500">{task.description}</p>
              <p className="text-xs text-slate-400">期日: {new Date(task.suggestedDeadline).toLocaleDateString("ja-JP")}</p>
            </Card>
          ))}
          <Button onClick={approveTask} disabled={approving} className="w-full bg-violet-600 hover:bg-violet-700">
            {approving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />スケジューリング中…</>
              : <><Check className="w-4 h-4 mr-2" />承認してタスクカレンダーに追加</>
            }
          </Button>
        </div>
      )}

      {/* 予定解析結果 */}
      {mode === "event" && extractedEvent && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600">解析された予定</p>
          <Card className="p-3 space-y-1 border-indigo-100">
            <p className="font-medium text-sm">{extractedEvent.title}</p>
            <p className="text-xs text-slate-500">
              {format(new Date(extractedEvent.start), "M月d日 (E) HH:mm", { locale: ja })}
              {" – "}
              {format(new Date(extractedEvent.end), "HH:mm")}
            </p>
            {extractedEvent.description && (
              <p className="text-xs text-slate-400">{extractedEvent.description}</p>
            )}
          </Card>
          <Button onClick={approveEvent} disabled={approving} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {approving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />追加中…</>
              : <><Check className="w-4 h-4 mr-2" />承認して予定に追加</>
            }
          </Button>
        </div>
      )}
    </div>
  );
}
