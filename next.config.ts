import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // WSL から Windows ホスト IP 経由(172.30.240.1)で dev サーバへアクセスする際、
  // Next.js 16 のクロスオリジン dev リソース制限(HMR)で hydration が失敗するのを防ぐ。
  // 本番(next start / Vercel)では無視される dev 専用設定。
  allowedDevOrigins: ["172.30.240.1"],
};

export default nextConfig;
