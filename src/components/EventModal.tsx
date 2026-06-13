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
import TimeSelect from "./TimeSelect";
import {
  jstToUTC,
  utcToJSTDate,
  utcToJSTTime,
  todayJST,
} from "@/lib/datetime";
import type { EventData } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  event?: EventData | null;
  defaultStart?: string;
  onSaved: () => void;
}

// "HH:mm" に hours 時間を加算（24:00 を超えたら 23:45 に丸める）
function addHours(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  let total = h * 60 + m + hours * 60;
  if (total > 23 * 60 + 45) total = 23 * 60 + 45;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export default function EventModal({
  open,
  onClose,
  event,
  defaultStart,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // 日付クリック/範囲選択で新規作成する場合: 日付は固定（ラベル表示）
  const isNewWithDate = !event && !!defaultStart;
  const dateDisplay = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("ja-JP", {
        year: "numeric", month: "long", day: "numeric", weekday: "short",
      })
    : "";

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(utcToJSTDate(event.start));
      setStartTime(utcToJSTTime(event.start));
      setEndTime(utcToJSTTime(event.end));
      setIsAllDay(event.allDay ?? false);
      setDescription(event.description ?? "");
      setLocation(event.location ?? "");
      setColor(event.color);
    } else {
      setTitle("");
      setIsAllDay(false);
      setDescription("");
      setLocation("");
      setColor("#3b82f6");

      if (defaultStart) {
        const d = defaultStart.slice(0, 10);
        const hasTime = defaultStart.length > 10 && defaultStart.includes("T");
        const st = hasTime ? defaultStart.slice(11, 16) : "09:00";
        setDate(d);
        setStartTime(st);
        setEndTime(addHours(st, 1));
      } else {
        setDate(todayJST());
        setStartTime("09:00");
        setEndTime("10:00");
      }
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
      if (data.start) {
        setDate(utcToJSTDate(data.start));
        setStartTime(utcToJSTTime(data.start));
      }
      if (data.end) setEndTime(utcToJSTTime(data.end));
      setDescription(data.description ?? "");
      setIsAllDay(false);
      toast.success("予定を解析しました");
    } catch {
      toast.error("AIの解析に失敗しました。手動で入力してください。");
    } finally {
      setAiLoading(false);
    }
  }

  async function save() {
    if (!title) {
      toast.error("タイトルは必須です");
      return;
    }
    if (!date) {
      toast.error("日付は必須です");
      return;
    }
    if (!isAllDay && endTime <= startTime) {
      toast.error("終了時刻は開始時刻より後にしてください");
      return;
    }

    const body = {
      title,
      allDay: isAllDay,
      start: isAllDay ? jstToUTC(date, "00:00") : jstToUTC(date, startTime),
      end: isAllDay ? jstToUTC(date, "23:59") : jstToUTC(date, endTime),
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

          {/* 日時入力エリア */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>日時 *</Label>
              {isAllDay ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAllDay(false)}
                  className="text-xs h-7 px-2 text-slate-500"
                >
                  時刻を指定する
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAllDay(true)}
                  className="text-xs h-7 px-2 text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                >
                  終日
                </Button>
              )}
            </div>

            {/* 日付: 日付クリック新規は固定ラベル、それ以外は日付入力 */}
            {isNewWithDate ? (
              <div className="text-sm font-medium text-slate-700 py-2 px-3 bg-slate-50 rounded-md border border-slate-200">
                {dateDisplay}
              </div>
            ) : (
              <div>
                <Label className="text-xs text-slate-500">日付</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            )}

            {isAllDay ? (
              <div className="py-2 px-3 bg-indigo-50 rounded-md border border-indigo-200 text-sm text-indigo-700 font-medium">
                終日
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-500">開始時刻</Label>
                  <TimeSelect value={startTime} onChange={setStartTime} />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">終了時刻</Label>
                  <TimeSelect value={endTime} onChange={setEndTime} />
                </div>
              </div>
            )}
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
