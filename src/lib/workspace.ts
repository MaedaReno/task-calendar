import { NextRequest } from "next/server";

/**
 * ワークスペース（データ分離単位）の識別。
 * パスワード無しの軽量方式: クライアントが cookie `ws` にキーを入れて送信し、
 * サーバはそれで全データを絞り込む。未指定や不正値は "default"（既存共有データ）にフォールバック。
 */
export const DEFAULT_WORKSPACE = "default";
export const WORKSPACE_COOKIE = "ws";

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

/** リクエストの cookie からワークスペースIDを取り出す */
export function getWorkspaceId(req: NextRequest): string {
  return normalizeWorkspaceId(req.cookies.get(WORKSPACE_COOKIE)?.value);
}
