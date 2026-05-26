"use client";

import { useState, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SpeechRecognitionResult {
  readonly transcript: string;
}
interface SpeechRecognitionAlternative {
  readonly [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent {
  readonly results: { readonly [index: number]: SpeechRecognitionAlternative };
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface Props {
  onResult: (text: string) => void;
}

export default function VoiceInputButton({ onResult }: Props) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const win = window as unknown as Record<string, new () => SpeechRecognitionInstance>;
    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "ja-JP";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }

  return (
    <Button
      type="button"
      variant={listening ? "destructive" : "outline"}
      size="icon"
      onClick={toggle}
      title={listening ? "録音停止" : "音声入力"}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </Button>
  );
}
