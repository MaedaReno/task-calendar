"use client";

import { useEffect, useState } from "react";
import { useSession, signIn, getProviders } from "next-auth/react";
import { Loader2, LogIn, Zap } from "lucide-react";

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  discord: "Discord",
};

/**
 * ログイン必須ゲート。
 * 未ログインの場合は本文の代わりにログイン画面を表示し、アプリ本体は見せない。
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    getProviders()
      .then((p) => setProviders(p ? Object.keys(p) : []))
      .catch(() => setProviders([]));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-32" style={{ color: "var(--text-muted)" }}>
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (status === "authenticated") {
    return <>{children}</>;
  }

  // 未ログイン → ログイン画面
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          background: "var(--surface-modal)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--modal-shadow)",
        }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))" }}
        >
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          ログインが必要です
        </h1>
        <p className="text-xs leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
          AI カレンダーのご利用にはログインが必要です。
          お使いのアカウントでログインすると、あなた専用のデータが表示されます。
        </p>

        {providers.length > 0 ? (
          <div className="space-y-2">
            {providers.map((id) => (
              <button
                key={id}
                onClick={() => signIn(id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "var(--accent-cyan-dim)",
                  color: "var(--accent-cyan)",
                  border: "1px solid var(--accent-cyan-glow)",
                }}
              >
                <LogIn className="w-4 h-4" />
                {PROVIDER_LABEL[id] ?? id} でログイン
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            ログインが設定されていません。管理者に連絡してください。
            （OAuth の環境変数が未設定の可能性があります）
          </p>
        )}
      </div>
    </div>
  );
}
