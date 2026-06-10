"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Check, CalendarDays, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { AIExtractedTask } from "@/types";
import VoiceInputButton from "./VoiceInputButton";

interface Props {
  onApproved: () => void;
}

interface ExtractedEvent {
  title: string;
  start: string;
  end: string;
  description?: string;
}

type ParseResult =
  | { type: "task"; tasks: AIExtractedTask[] }
  | { type: "event"; event: ExtractedEvent }
  | null;

export default function AIInputPanel({ onApproved }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [result, setResult] = useState<ParseResult>(null);

  async function extract() {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as ParseResult);
    } catch {
      toast.error("AIの解析に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  async function approveTask(tasks: AIExtractedTask[]) {
    setApproving(true);
    let successCount = 0;
    for (const task of tasks) {
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
      setResult(null);
      setInput("");
      onApproved();
    } else {
      toast.error("タスクの追加に失敗しました");
    }
  }

  async function approveEvent(event: ExtractedEvent) {
    setApproving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!res.ok) throw new Error();
      toast.success("予定を追加しました");
      setResult(null);
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
      {/* Input area */}
      <div className="flex gap-2">
        <Textarea
          placeholder="例: 来月のゼミ発表を準備する、明日14時から会議がある…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          className="flex-1 text-sm resize-none"
          style={{
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
        />
        <div className="flex flex-col gap-2">
          <VoiceInputButton onResult={(t) => setInput((prev) => prev + t)} />
          <button
            onClick={extract}
            disabled={loading || !input.trim()}
            title="AIで解析"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
            }}
          >
            {loading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Sparkles className="w-4 h-4 text-white" />
            }
          </button>
        </div>
      </div>

      {/* Task result */}
      {result?.type === "task" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <ListTodo className="w-3.5 h-3.5" style={{ color: "var(--accent-violet)" }} />
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              タスクとして認識 ({result.tasks.length}件)
            </p>
          </div>
          {result.tasks.map((task, i) => (
            <div
              key={i}
              className="p-3 space-y-1 rounded-xl"
              style={{ background: "var(--accent-violet-dim)", border: "1px solid rgba(167,139,250,0.2)" }}
            >
              <div className="flex items-start justify-between">
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{task.title}</p>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-md ml-2 shrink-0"
                  style={{ background: "var(--glass-bg-active)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
                >
                  {task.estimatedHours}h
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{task.description}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                期日: {new Date(task.suggestedDeadline).toLocaleDateString("ja-JP")}
              </p>
            </div>
          ))}
          <button
            onClick={() => approveTask(result.tasks)}
            disabled={approving}
            className="w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50"
            style={{
              background: "var(--accent-violet-dim)",
              color: "var(--accent-violet)",
              border: "1px solid rgba(167,139,250,0.3)",
            }}
          >
            {approving
              ? <><Loader2 className="w-4 h-4 animate-spin" />スケジューリング中…</>
              : <><Check className="w-4 h-4" />承認してタスクに追加</>
            }
          </button>
        </div>
      )}

      {/* Event result */}
      {result?.type === "event" && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" style={{ color: "var(--accent-cyan)" }} />
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>予定として認識</p>
          </div>
          <div
            className="p-3 space-y-1 rounded-xl"
            style={{ background: "var(--accent-cyan-dim)", border: "1px solid rgba(56,189,248,0.2)" }}
          >
            <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{result.event.title}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {format(new Date(result.event.start), "M月d日 (E) HH:mm", { locale: ja })}
              {" – "}
              {format(new Date(result.event.end), "HH:mm")}
            </p>
            {result.event.description && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{result.event.description}</p>
            )}
          </div>
          <button
            onClick={() => approveEvent(result.event)}
            disabled={approving}
            className="w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50"
            style={{
              background: "var(--accent-cyan-dim)",
              color: "var(--accent-cyan)",
              border: "1px solid rgba(56,189,248,0.3)",
            }}
          >
            {approving
              ? <><Loader2 className="w-4 h-4 animate-spin" />追加中…</>
              : <><Check className="w-4 h-4" />承認して予定に追加</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
