"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import VoiceInputButton from "./VoiceInputButton";
import AIChatDialog from "./AIChatDialog";

interface Props {
  onApproved: () => void;
}

export default function AIInputPanel({ onApproved }: Props) {
  const [input, setInput] = useState("");
  const [dialogInput, setDialogInput] = useState<string | null>(null);

  function start() {
    if (!input.trim()) return;
    setDialogInput(input.trim());
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
            onClick={start}
            disabled={!input.trim()}
            title="AIで解析"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
            }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        AIが不足情報を質問しながら、予定/タスクを登録します。
      </p>

      {dialogInput && (
        <AIChatDialog
          initialInput={dialogInput}
          onClose={() => setDialogInput(null)}
          onApproved={() => {
            setDialogInput(null);
            setInput("");
            onApproved();
          }}
        />
      )}
    </div>
  );
}
