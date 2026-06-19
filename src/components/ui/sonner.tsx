"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

// 以前は next-themes の useTheme と多数のカスタム props を渡していたが、
// React 19 / Next 16 でトーストが一切描画されない問題があったため、
// ダークテーマ固定の最小構成に簡素化する。
const Toaster = (props: ToasterProps) => {
  return <Sonner theme="dark" className="toaster group" richColors {...props} />;
};

export { Toaster };
