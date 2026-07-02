import { NextRequest } from "next/server";
import { auth } from "@/auth";

/**
 * ワークスペース（データ分離単位）の識別。
 * ログイン必須。ログイン中ユーザーのアカウント専用空間 "u_<userId>" を返す。
 * 未ログイン（またはセッション取得失敗）の場合は null を返し、呼び出し側で 401 を返す。
 */
export const USER_WS_PREFIX = "u_";

export async function getWorkspaceId(_req?: NextRequest): Promise<string | null> {
  try {
    const session = await auth();
    if (session?.user?.id) return `${USER_WS_PREFIX}${session.user.id}`;
  } catch {
    /* 認証未設定/失敗時も未ログイン扱い */
  }
  return null;
}

/** 未ログイン時に返す 401 レスポンス */
export function unauthorized() {
  return Response.json(
    { error: "unauthorized", message: "ログインが必要です" },
    { status: 401 }
  );
}
