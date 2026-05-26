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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import VoiceInputButton from "./VoiceInputButton";
import type { EventData } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  event?: EventData | null;
  defaultStart?: string;
  onSaved: () => void;
}

export default function EventModal({
  open,
  onClose,
  event,
  defaultStart,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setStart(event.start.slice(0, 16));
      setEnd(event.end.slice(0, 16));
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setColor(event.color);
    } else {
      setTitle("");
      setStart(defaultStart ? defaultStart.slice(0, 16) : "");
      setEnd("");
      setDescription("");
      setLocation("");
      setColor("#3b82f6");
    }
    setAiInput("");
  }, [event, defaultStart, open]);

  async function parseWithAI() {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/parse-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: aiInput }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTitle(data.title ?? "");
      setStart(data.start ? data.start.slice(0, 16) : "");
      setEnd(data.end ? data.end.slice(0, 16) : "");
      setDescription(data.description ?? "");
      toast.success("予定を解析しました");
    } catch {
      toast.error("AIの解析に失敗しました。手動で入力してください。");
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    if (!title || !start || !end) {
      toast.error("タイトル・開始・終了は必須です");
      return;
    }
    const body = {
      title,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      description,
      location,
      color,
    };
    const res = event
      ? await fetch(`/api/events/${event.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    if (res.ok) {
      toast.success(event ? "予定を更新しました" : "予定を追加しました");
      onSaved();
    } else {
      toast.error("保存に失敗しました");
    }
  }

  async function deleteEvent() {
    if (!event) return;
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("予定を削除しました");
      onSaved();
    } else {
      toast.error("削除に失敗しました");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "予定を編集" : "予定を追加"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={event ? "manual" : "ai"}>
          <TabsList className="w-full">
            <TabsTrigger value="ai" className="flex-1">AIで入力</TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">手動で入力</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-3 mt-3">
            <Label>自然言語または音声で予定を入力</Label>
            <div className="flex gap-2">
              <Input
                placeholder="例: 来週月曜14時から1時間、田中さんと打ち合わせ"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && parseWithAI()}
              />
              <VoiceInputButton onResult={(t) => setAiInput(t)} />
            </div>
            <Button
              onClick={parseWithAI}
              disabled={aiLoading || !aiInput.trim()}
              className="w-full"
            >
              {aiLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />解析中…</>
              ) : (
                "AIで解析して入力"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="manual" className="space-y-3 mt-3" />
        </Tabs>

        <div className="space-y-3">
          <div>
            <Label>タイトル *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>開始 *</Label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <Label>終了 *</Label>
              <Input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>場所</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>メモ</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>カラー</Label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="block w-10 h-8 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-between pt-2">
          {event && (
            <Button variant="destructive" onClick={deleteEvent}>
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
