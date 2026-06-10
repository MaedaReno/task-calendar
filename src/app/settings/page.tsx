"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Clock, LayoutTemplate, Trash2, Plus } from "lucide-react";
import type { UserSettingsData, TaskTemplateData, SubtaskTemplate } from "@/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [workStart, setWorkStart] = useState("9");
  const [workEnd, setWorkEnd] = useState("21");
  const [saving, setSaving] = useState(false);

  const [templates, setTemplates] = useState<TaskTemplateData[]>([]);
  const [tmplTitle, setTmplTitle] = useState("");
  const [tmplHours, setTmplHours] = useState("");
  const [tmplSubtasks, setTmplSubtasks] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: UserSettingsData) => {
        setSettings(s);
        setWorkStart(s.workStartHour.toString());
        setWorkEnd(s.workEndHour.toString());
      });
    fetch("/api/templates")
      .then((r) => r.json())
      .then(setTemplates);
  }, []);

  async function saveSettings() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workStartHour: parseInt(workStart),
        workEndHour: parseInt(workEnd),
      }),
    });
    setSaving(false);
    if (res.ok) toast.success("設定を保存しました");
    else toast.error("保存に失敗しました");
  }

  async function addTemplate() {
    if (!tmplTitle) return;
    let defaultSubtasks: SubtaskTemplate[] = [];
    if (tmplSubtasks.trim()) {
      defaultSubtasks = tmplSubtasks.split("\n").filter(Boolean).map((l) => ({
        title: l.trim(),
      }));
    }
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: tmplTitle,
        estimatedHours: tmplHours ? parseFloat(tmplHours) : undefined,
        defaultSubtasks,
      }),
    });
    if (res.ok) {
      toast.success("テンプレートを追加しました");
      setTmplTitle("");
      setTmplHours("");
      setTmplSubtasks("");
      fetch("/api/templates").then((r) => r.json()).then(setTemplates);
    }
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("削除しました");
  }

  const inputStyle = {
    background: "var(--glass-bg)",
    border: "1px solid var(--glass-border)",
    color: "var(--text-primary)",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page title */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--accent-cyan)" }}>
          Settings
        </p>
        <h1 className="text-2xl font-light" style={{ color: "var(--text-primary)" }}>設定</h1>
      </div>

      {/* Work hours */}
      <div
        className="rounded-2xl p-5 space-y-5"
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-cyan-dim)", border: "1px solid rgba(56,189,248,0.2)" }}
          >
            <Clock className="w-4 h-4" style={{ color: "var(--accent-cyan)" }} />
          </div>
          <h2 className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>作業時間設定</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>
              作業開始時刻
            </Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>
              作業終了時刻
            </Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
            color: "white",
          }}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          保存
        </button>
      </div>

      {/* Templates */}
      <div
        className="rounded-2xl p-5 space-y-5"
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-violet-dim)", border: "1px solid rgba(167,139,250,0.2)" }}
          >
            <LayoutTemplate className="w-4 h-4" style={{ color: "var(--accent-violet)" }} />
          </div>
          <h2 className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>タスクテンプレート</h2>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>テンプレート名</Label>
            <Input
              value={tmplTitle}
              onChange={(e) => setTmplTitle(e.target.value)}
              placeholder="例: レポート作成"
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>見積時間 (h)</Label>
            <Input
              type="number"
              value={tmplHours}
              onChange={(e) => setTmplHours(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "var(--text-secondary)" }}>
              デフォルトサブタスク（1行1つ）
            </Label>
            <textarea
              className="w-full rounded-xl p-3 text-sm min-h-[80px] resize-none"
              style={{
                ...inputStyle,
                outline: "none",
              }}
              value={tmplSubtasks}
              onChange={(e) => setTmplSubtasks(e.target.value)}
              placeholder={"資料収集\n構成作成\n執筆"}
            />
          </div>
          <button
            onClick={addTemplate}
            disabled={!tmplTitle}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
            style={{
              background: "var(--accent-violet-dim)",
              color: "var(--accent-violet)",
              border: "1px solid rgba(167,139,250,0.25)",
            }}
          >
            <Plus className="w-4 h-4" />
            テンプレートを追加
          </button>
        </div>

        {templates.length > 0 && (
          <div
            className="space-y-2 pt-4"
            style={{ borderTop: "1px solid var(--glass-border)" }}
          >
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between text-sm py-2 px-3 rounded-xl"
                style={{ background: "var(--glass-bg-hover)" }}
              >
                <div>
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>{t.title}</span>
                  {t.estimatedHours && (
                    <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      {t.estimatedHours}h
                    </span>
                  )}
                  <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    ({t.defaultSubtasks.length}サブタスク)
                  </span>
                </div>
                <button
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: "#ef4444" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  onClick={() => deleteTemplate(t.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {settings && (
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          タイムゾーン: {settings.timezone}
        </p>
      )}
    </div>
  );
}
