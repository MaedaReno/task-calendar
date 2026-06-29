"use client";

import { SessionProvider } from "next-auth/react";

/**
 * next-auth のクライアント用 SessionProvider ラッパー。
 * useSession() を使うクライアントコンポーネント（AuthButton 等）の上位に置く。
 */
export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
