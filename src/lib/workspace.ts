import { NextRequest } from "next/server";
import { auth } from "@/auth";

/**
 * ワークスペース（データ分離単位）の識別。
 * - ログイン中: アカウント専用空間 "u_<userId>" を使う。
 * - ログアウト中: cookie `ws` の手動キー方式（未指定や不正値は "default"）。
 */
export const DEFAULT_WORKSPACE = "default";
export const WORKSPACE_COOKIE = "ws";
// ログインユーザー専用空間の接頭辞。手動キーでは予約語として拒否する。
const USER_WS_PREFIX = "u_";

export function normalizeWorkspaceId(raw?: string | null): string {
  if (!raw) return DEFAULT_WORKSPACE;
  let v = raw.trim();
  try {
    // クライアントは encodeURIComponent して保存するため、念のためデコードを試みる
    v = decodeURIComponent(v);
  } catch {
    /* 不正なエンコードはそのまま扱う */
  }
  v = v.trim().slice(0, 64);
  return v.length > 0 ? v : DEFAULT_WORKSPACE;
}

/**
 * リクエストからワークスペースIDを決定する。
 * セッションがあればログインユーザー専用空間を優先し、無ければ cookie `ws` を使う。
 * 認証 env 未設定などで auth() が失敗しても cookie 方式へフォールバックする。
 */
export async function getWorkspaceId(req: NextRequest): Promise<string> {
  try {
    const session = await auth();
    if (session?.user?.id) return `${USER_WS_PREFIX}${session.user.id}`;
  } catch {
    /* 認証未設定/失敗時は cookie 方式へ */
  }
  const ws = normalizeWorkspaceId(req.cookies.get(WORKSPACE_COOKIE)?.value);
  // 手動キーで "u_" を名乗ってログインユーザーの空間を覗くのを防ぐ
  return ws.startsWith(USER_WS_PREFIX) ? DEFAULT_WORKSPACE : ws;
}
