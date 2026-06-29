"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut, getProviders } from "next-auth/react";
import { LogIn, LogOut, ChevronDown, Loader2 } from "lucide-react";

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  discord: "Discord",
};

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getProviders()
      .then((p) => setProviders(p ? Object.keys(p) : []))
      .catch(() => setProviders([]));
  }, []);

  // 外側クリックで閉じる
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const triggerBase =
    "ml-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 shrink-0";

  if (status === "loading") {
    return (
      <div className="ml-1 flex items-center justify-center w-8 h-8 shrink-0" style={{ color: "var(--text-muted)" }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      </div>
    );
  }

  const loggedIn = status === "authenticated" && !!session?.user;
  const name = session?.user?.name || session?.user?.email || "ユーザー";
  const image = session?.user?.image ?? null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerBase}
        style={
          loggedIn
            ? { background: "var(--accent-violet-dim)", color: "var(--accent-violet)", border: "1px solid var(--accent-violet-glow)" }
            : { background: "var(--accent-cyan-dim)", color: "var(--accent-cyan)", border: "1px solid var(--accent-cyan-glow)" }
        }
      >
        {loggedIn ? (
          <>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="w-4 h-4 rounded-full" />
            ) : (
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                style={{ background: "var(--accent-violet)", color: "white" }}
              >
                {name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="hidden sm:inline max-w-[100px] truncate">{name}</span>
            <ChevronDown className="w-3 h-3" />
          </>
        ) : (
          <>
            <LogIn className="w-3.5 h-3.5" />
            <span>ログイン</span>
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-xl p-2 z-50"
          style={{
            background: "var(--surface-modal)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--modal-shadow)",
          }}
        >
          {loggedIn ? (
            <>
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{name}</p>
                {session?.user?.email && (
                  <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{session.user.email}</p>
                )}
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>専用ワークスペースで利用中</p>
              </div>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <LogOut className="w-3.5 h-3.5" />
                ログアウト
              </button>
            </>
          ) : providers.length > 0 ? (
            <>
              <p className="px-2 py-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                アカウントでログイン
              </p>
              {providers.map((id) => (
                <button
                  key={id}
                  onClick={() => signIn(id)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--glass-bg-hover)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <LogIn className="w-3.5 h-3.5" style={{ color: "var(--accent-cyan)" }} />
                  {PROVIDER_LABEL[id] ?? id} でログイン
                </button>
              ))}
            </>
          ) : (
            <p className="px-2 py-2 text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              ログインは未設定です。OAuth の環境変数（AUTH_GOOGLE_ID 等）を設定すると有効になります。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
