"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">設定</h1>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">作業時間設定</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>作業開始時刻</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
            />
          </div>
          <div>
            <Label>作業終了時刻</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          保存
        </Button>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">タスクテンプレート</h2>

        <div className="space-y-2">
          <div>
            <Label>テンプレート名</Label>
            <Input
              value={tmplTitle}
              onChange={(e) => setTmplTitle(e.target.value)}
              placeholder="例: レポート作成"
            />
          </div>
          <div>
            <Label>見積時間 (h)</Label>
            <Input
              type="number"
              value={tmplHours}
              onChange={(e) => setTmplHours(e.target.value)}
            />
          </div>
          <div>
            <Label>デフォルトサブタスク（1行1つ）</Label>
            <textarea
              className="w-full border rounded-md p-2 text-sm min-h-[80px]"
              value={tmplSubtasks}
              onChange={(e) => setTmplSubtasks(e.target.value)}
              placeholder={"資料収集\n構成作成\n執筆"}
            />
          </div>
          <Button onClick={addTemplate} disabled={!tmplTitle}>
            テンプレートを追加
          </Button>
        </div>

        {templates.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between text-sm py-1"
              >
                <div>
                  <span className="font-medium">{t.title}</span>
                  {t.estimatedHours && (
                    <span className="text-gray-400 ml-2">{t.estimatedHours}h</span>
                  )}
                  <span className="text-gray-400 ml-2">
                    ({t.defaultSubtasks.length}サブタスク)
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => deleteTemplate(t.id)}
                >
                  削除
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
