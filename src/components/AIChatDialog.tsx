"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send, CheckCircle2, X, CalendarDays, ListTodo, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

type Message = { role: "ai" | "user"; content: string };

type ProposedEvent = {
  title: string;
  start: string;
  end: string;
  description?: string | null;
};
type ProposedTask = {
  title: string;
  description: string;
  estimatedHours: number;
  startDate?: string;
  suggestedDeadline: string;
};
type Proposal = {
  events: ProposedEvent[];
  tasks: ProposedTask[];
};

interface Props {
  initialInput: string;
  onClose: () => void;
  onApproved: () => void;
}

export default function AIChatDialog({ initialInput, onClose, onApproved }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "user", content: initialInput },
  ]);
  const [input, setInput] = useState("");
  const [currentOptions, setCurrentOptions] = useState<string[] | null>(null);
  const [freeText, setFreeText] = useState(false);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      callAI([{ role: "user", content: initialInput }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!loading && !proposal) inputRef.current?.focus();
  }, [messages, loading, proposal]);

  async function callAI(history: Message[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/auto-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.type === "question") {
        setMessages((prev) => [...prev, { role: "ai", content: data.message }]);
        const opts: string[] = data.options ?? [];
        setCurrentOptions(opts.length > 0 ? opts : null);
        setFreeText(opts.length === 0);
      } else if (data.type === "proposal") {
        setMessages((prev) => [...prev, { role: "ai", content: data.message }]);
        setCurrentOptions(null);
        setFreeText(false);
        setProposal({ events: data.events ?? [], tasks: data.tasks ?? [] });
      }
    } catch {
      toast.error("AIとの通信に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setCurrentOptions(null);
    await callAI(next);
  }

  async function approveEvent(event: ProposedEvent) {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: event.title,
        start: event.start,
        end: event.end,
        description: event.description ?? undefined,
      }),
    });
    if (!res.ok) throw new Error();
  }

  async function approveTasks(tasks: ProposedTask[]) {
    for (const task of tasks) {
      const taskRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          startDate: task.startDate,
          deadline: task.suggestedDeadline,
          estimatedHours: task.estimatedHours,
        }),
      });
      if (!taskRes.ok) continue;
      const createdTask = await taskRes.json();

      // 細分化 → サブタスク登録 → スケジューリング
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
      if (!bdRes.ok) continue;
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
    }
  }

  async function approve() {
    if (!proposal) return;
    setSaving(true);
    try {
      for (const ev of proposal.events) {
        await approveEvent(ev);
      }
      if (proposal.tasks.length > 0) {
        await approveTasks(proposal.tasks);
      }
      const n = proposal.events.length + proposal.tasks.length;
      toast.success(`${n}件を登録しました`);
      onApproved();
    } catch {
      toast.error("追加に失敗しました");
    } finally {
      setSaving(false);
    }
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
              AIと一緒に登録
            </p>
            <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
              {initialInput}
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
                    ? { background: "var(--glass-bg-hover)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }
                    : { background: "var(--accent-violet-dim)", color: "var(--accent-violet)", border: "1px solid rgba(167,139,250,0.3)" }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Event proposals */}
          {proposal && proposal.events.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
              <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: "var(--accent-cyan-dim)", borderBottom: "1px solid var(--glass-border)" }}>
                <CalendarDays className="w-3.5 h-3.5" style={{ color: "var(--accent-cyan)" }} />
                <p className="text-xs font-medium" style={{ color: "var(--accent-cyan)" }}>予定の提案（{proposal.events.length}件）</p>
              </div>
              {proposal.events.map((ev, i) => (
                <div
                  key={i}
                  className="px-3 py-2.5 space-y-1"
                  style={{ borderBottom: i < proposal.events.length - 1 ? "1px solid var(--glass-border)" : "none" }}
                >
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{ev.title}</p>
                  <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <Clock className="w-3 h-3" />
                    {format(new Date(ev.start), "M月d日 (E) HH:mm", { locale: ja })}
                    {" – "}
                    {format(new Date(ev.end), "HH:mm")}
                  </p>
                  {ev.description && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{ev.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Task proposals */}
          {proposal && proposal.tasks.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
              <div className="px-3 py-2 flex items-center gap-1.5" style={{ background: "var(--accent-violet-dim)", borderBottom: "1px solid var(--glass-border)" }}>
                <ListTodo className="w-3.5 h-3.5" style={{ color: "var(--accent-violet)" }} />
                <p className="text-xs font-medium" style={{ color: "var(--accent-violet)" }}>
                  タスクの提案（{proposal.tasks.length}件）
                </p>
              </div>
              {proposal.tasks.map((t, i) => (
                <div
                  key={i}
                  className="px-3 py-2.5 space-y-1"
                  style={{ borderBottom: i < proposal.tasks.length - 1 ? "1px solid var(--glass-border)" : "none" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>{t.title}</p>
                    <span className="text-xs flex items-center gap-1 shrink-0" style={{ color: "var(--text-muted)" }}>
                      <Clock className="w-3 h-3" />{t.estimatedHours}h
                    </span>
                  </div>
                  <p className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <CalendarDays className="w-3 h-3" />
                    {t.startDate && `${format(new Date(t.startDate), "M/d")} 〜 `}
                    {format(new Date(t.suggestedDeadline), "M/d")} 期日
                  </p>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-3 py-2 flex items-center gap-2" style={{ background: "var(--glass-bg-hover)", border: "1px solid var(--glass-border)" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--text-muted)" }} />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>考え中…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Bottom action */}
        {proposal ? (
          <div className="px-4 py-3 shrink-0 flex gap-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
            <button
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-40"
              style={{ background: "var(--glass-bg-hover)", color: "var(--text-muted)", border: "1px solid var(--glass-border)" }}
              onClick={onClose}
              disabled={saving}
            >
              キャンセル
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-40"
              style={{ background: "var(--accent-cyan-dim)", color: "var(--accent-cyan)", border: "1px solid rgba(56,189,248,0.3)" }}
              onClick={approve}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              承認して登録
            </button>
          </div>
        ) : (
          <div className="px-4 py-3 shrink-0 space-y-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
            {currentOptions && currentOptions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentOptions.map((opt, i) => (
                  <button
                    key={i}
                    className="text-xs px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
                    style={{ background: "var(--accent-violet-dim)", color: "var(--accent-violet)", border: "1px solid rgba(167,139,250,0.3)" }}
                    disabled={loading}
                    onClick={() => sendMessage(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
                style={{ background: "var(--glass-bg-hover)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}
                placeholder={freeText ? "回答を入力…" : currentOptions ? "または自由に入力…" : "返答を入力…"}
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
                style={{ background: "var(--accent-violet-dim)", color: "var(--accent-violet)", border: "1px solid rgba(167,139,250,0.3)" }}
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
