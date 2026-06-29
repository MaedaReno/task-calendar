"use client";

import { useState } from "react";
import { ensureWorkspaceCookie } from "@/lib/workspace-client";

/**
 * アプリ起動時に localStorage のワークスペースを cookie へ反映する。
 * useState の初期化関数は描画フェーズで一度だけ走るため、
 * 子コンポーネントの fetch(useEffect) より前に cookie が確実にセットされる。
 */
export default function WorkspaceInit() {
  useState(() => {
    ensureWorkspaceCookie();
    return null;
  });
  return null;
}
