import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/lib/toast";
import NavBar from "@/components/NavBar";
import ThemeProvider from "@/components/ThemeProvider";
import AuthSessionProvider from "@/components/SessionProvider";
import AuthGate from "@/components/AuthGate";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "AI カレンダー",
  description: "AI統合カレンダー & タスク管理アプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider>
          <AuthSessionProvider>
            <NavBar />
            <main className="flex-1">
              <AuthGate>{children}</AuthGate>
            </main>
            <Toaster />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
