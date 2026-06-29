"use client";

/**
 * クライアント側のワークスペース管理。
 * localStorage に保存し、毎回 cookie `ws` にも反映する（API は cookie を読む）。
 * 同じキーを使う人同士はデータを共有し、別キーにすれば分離される。
 */
export const DEFAULT_WORKSPACE = "default";
const STORAGE_KEY = "workspaceId";
const COOKIE = "ws";

export function normalizeWorkspaceId(raw?: string | null): string {
  if (!raw) return DEFAULT_WORKSPACE;
  const v = raw.trim().slice(0, 64);
  return v.length > 0 ? v : DEFAULT_WORKSPACE;
}

export function getWorkspaceId(): string {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE;
  return normalizeWorkspaceId(window.localStorage.getItem(STORAGE_KEY));
}

function writeCookie(id: string) {
  // 1年保持・全パス・同一サイト
  document.cookie = `${COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
}

/** localStorage の値を cookie に反映（アプリ起動時に呼ぶ） */
export function ensureWorkspaceCookie() {
  if (typeof document === "undefined") return;
  writeCookie(getWorkspaceId());
}

/** ワークスペースを切り替える。cookie/localStorage を更新してページを再読み込みする */
export function setWorkspaceIdAndReload(raw: string) {
  const id = normalizeWorkspaceId(raw);
  window.localStorage.setItem(STORAGE_KEY, id);
  writeCookie(id);
  window.location.reload();
}
