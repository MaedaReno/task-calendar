"use client";

// 軽量トースト（依存非依存）。
// 重要: Turbopack(dev) は layout チャンクと page チャンクで同一モジュールを二重化することがあり、
// module-level の singleton ストアだと toast() 側と <Toaster> 側で別インスタンスになって反映されない
// （sonner が描画されなかった根本原因もこれ）。そのためストアを globalThis に載せて全チャンクで共有する。
import { useSyncExternalStore } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}
interface ToastStore {
  items: ToastItem[];
  listeners: Set<() => void>;
  counter: number;
}

// Turbopack(dev) はチャンクごとに globalThis が別物になることがあり、module-level や
// globalThis 上の singleton では toast() 側と <Toaster> 側でストアが分断される。
// 一方 window はページ唯一で全チャンク共有なので、ブラウザでは window に載せて共有する。
const EMPTY: ToastItem[] = [];
function getStore(): ToastStore {
  const host = (typeof window !== "undefined" ? window : globalThis) as unknown as {
    __APP_TOAST_STORE__?: ToastStore;
  };
  return (
    host.__APP_TOAST_STORE__ ??
    (host.__APP_TOAST_STORE__ = { items: [], listeners: new Set(), counter: 0 })
  );
}

function emit() {
  getStore().listeners.forEach((l) => l());
}
function remove(id: number) {
  const s = getStore();
  s.items = s.items.filter((i) => i.id !== id);
  emit();
}
function add(type: ToastType, message: string, duration = 4000): number {
  const s = getStore();
  const id = ++s.counter;
  s.items = [...s.items, { id, type, message }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => remove(id), duration);
  }
  return id;
}

export const toast = Object.assign((message: string) => add("info", message), {
  success: (m: string) => add("success", m),
  error: (m: string) => add("error", m),
  warning: (m: string) => add("warning", m),
  info: (m: string) => add("info", m),
});

function subscribe(cb: () => void) {
  const s = getStore();
  s.listeners.add(cb);
  return () => {
    s.listeners.delete(cb);
  };
}
function getSnapshot() {
  return getStore().items;
}
function getServerSnapshot() {
  return EMPTY;
}

const TYPE_STYLE: Record<ToastType, { color: string; border: string }> = {
  success: { color: "#34d399", border: "rgba(52,211,153,0.45)" },
  error: { color: "#f87171", border: "rgba(248,113,113,0.45)" },
  warning: { color: "#fbbf24", border: "rgba(251,191,36,0.45)" },
  info: { color: "#38bdf8", border: "rgba(56,189,248,0.45)" },
};
const ICON = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };

export function Toaster() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: "min(92vw, 380px)",
        pointerEvents: "none",
      }}
    >
      {list.map((t) => {
        const s = TYPE_STYLE[t.type];
        const Icon = ICON[t.type];
        return (
          <div
            key={t.id}
            role="status"
            onClick={() => remove(t.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              background: "#0f1626",
              border: `1px solid ${s.border}`,
              borderLeft: `3px solid ${s.color}`,
              color: "#e2e8f0",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 13,
              lineHeight: 1.5,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              pointerEvents: "auto",
              cursor: "pointer",
            }}
          >
            <Icon style={{ width: 16, height: 16, color: s.color, flexShrink: 0, marginTop: 1 }} />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
