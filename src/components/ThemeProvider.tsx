"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * 白ベースをデフォルトにし、ユーザー操作でダークへ切り替える。
 * attribute="class" で <html> に "light" / "dark" クラスを付与する
 * （globals.css の :root = light / .dark = dark に対応）。
 */
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
