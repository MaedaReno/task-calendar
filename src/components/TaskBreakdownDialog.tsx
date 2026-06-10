"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send, CheckCircle2, RotateCcw, X, Clock } from "lucide-react";
import { toast } from "sonner";
import type { TaskData } from "@/types";

type Message = { role: "ai" | "user"; content: string };
type ProposedSubtask = { title: string; estimatedHours: number };

interface Props {
  task: TaskData;
  onClose: () => void;
  onApproved: () => void;
}

export default function TaskBreakdownDialog({ task, onClose, onApproved }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposedSubtasks, setProposedSubtasks] = useState<ProposedSubtask[] | null>(null);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      callAI([]);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!loading && !proposedSubtasks) {
      inputRef.current?.focus();
    }
  }, [messages, loading, proposedSubtasks]);

  async function callAI(history: Message[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/breakdown-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description ?? "",
          deadline: task.deadline,
          estimatedHours: task.estimatedHours,
          history,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.type === "question") {
        setMessages((prev) => [...prev, { role: "ai", content: data.message }]);
      } else if (data.type === "proposal") {
        setMessages((prev) => [...prev, { role: "ai", content: data.message }]);
        setProposedSubtasks(data.subtasks);
      }
    } catch {
      toast.error("AIとの通信に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    await callAI(next);
  }

  async function approve() {
    if (!proposedSubtasks) return;
    setSaving(true);
    try {
      for (let i = 0; i < proposedSubtasks.length; i++) {
        await fetch("/api/subtasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            title: proposedSubtasks[i].title,
            estimatedHours: proposedSubtasks[i].estimatedHours,
            order: i,
          }),
        });
      }
      await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      toast.success("細分化したタスクをスケジュールに追加しました");
      onApproved();
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function retry() {
    setMessages([]);
    setProposedSubtasks(null);
    startedRef.current = false;
    setTimeout(() => {
      startedRef.current = true;
      callAI([]);
    }, 0);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl flex flex-col"
        style={{
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          maxHeight: "82vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div className="min-w-0 flex-1 mr-3">
            <p className="text-xs font-medium mb-0.5" style={{ color: "var(--accent-cyan)" }}>
              AIと一緒に細分化
            </p>
            <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
              {task.title}
            </h3>
          </div>
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                style={
                  msg.role === "ai"
                    ? {
                        background: "var(--glass-bg-hover)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--glass-border)",
                      }
                    : {
                        background: "var(--accent-violet-dim)",
                        color: "var(--accent-violet)",
                        border: "1px solid rgba(167,139,250,0.3)",
                      }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Proposed subtasks list */}
          {proposedSubtasks && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--glass-border)" }}
            >
              <div
                className="px-3 py-2"
                style={{
                  background: "var(--accent-cyan-dim)",
                  borderBottom: "1px solid var(--glass-border)",
                }}
              >
                <p className="text-xs font-medium" style={{ color: "var(--accent-cyan)" }}>
                  細分化の提案（{proposedSubtasks.length}件）
                </p>
              </div>
              {proposedSubtasks.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{
                    borderBottom:
                      i < proposedSubtasks.length - 1
                        ? "1px solid var(--glass-border)"
                        : "none",
                  }}
                >
                  <span
                    className="text-xs font-medium w-5 h-5 flex items-center justify-center rounded-md shrink-0"
                    style={{
                      background: "var(--glass-bg-hover)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="text-sm flex-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {s.title}
                  </span>
                  <span
                    className="text-xs flex items-center gap-1 shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Clock className="w-3 h-3" />
                    {s.estimatedHours}h
                  </span>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-3 py-2 flex items-center gap-2"
                style={{
                  background: "var(--glass-bg-hover)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <Loader2
                  className="w-3.5 h-3.5 animate-spin"
                  style={{ color: "var(--text-muted)" }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  考え中…
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Bottom action */}
        {proposedSubtasks ? (
          <div
            className="px-4 py-3 shrink-0 flex gap-2"
            style={{ borderTop: "1px solid var(--glass-border)" }}
          >
            <button
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-40"
              style={{
                background: "var(--glass-bg-hover)",
                color: "var(--text-muted)",
                border: "1px solid var(--glass-border)",
              }}
              onClick={retry}
              disabled={saving}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              やり直す
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-40"
              style={{
                background: "var(--accent-cyan-dim)",
                color: "var(--accent-cyan)",
                border: "1px solid rgba(56,189,248,0.3)",
              }}
              onClick={approve}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              承認してスケジュールに追加
            </button>
          </div>
        ) : (
          <div
            className="px-4 py-3 shrink-0 flex gap-2"
            style={{ borderTop: "1px solid var(--glass-border)" }}
          >
            <input
              ref={inputRef}
              className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
              style={{
                background: "var(--glass-bg-hover)",
                color: "var(--text-primary)",
                border: "1px solid var(--glass-border)",
              }}
              placeholder="返答を入力…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={loading}
            />
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
              style={{
                background: "var(--accent-violet-dim)",
                color: "var(--accent-violet)",
                border: "1px solid rgba(167,139,250,0.3)",
              }}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
