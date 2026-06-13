"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STEP_MIN = 15;

// 00:00〜23:45 を15分刻みで生成。現在値が刻みに無い場合は補完する。
function buildOptions(current?: string): string[] {
  const opts: string[] = [];
  for (let i = 0; i < 24 * 60; i += STEP_MIN) {
    const h = Math.floor(i / 60);
    const m = i % 60;
    opts.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  if (current && !opts.includes(current)) {
    opts.push(current);
    opts.sort();
  }
  return opts;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function TimeSelect({ value, onChange, disabled }: Props) {
  const options = buildOptions(value);
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
