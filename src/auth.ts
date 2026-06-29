import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import type { Provider } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// session.user.id を型に追加（DB戦略では adapter user の id を渡す）
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

// env(AUTH_GOOGLE_ID 等)が設定されているプロバイダのみ有効化する。
// 未設定でもアプリは起動でき、ログアウト状態の機能はそのまま使える。
const providers: Provider[] = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}
if (process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET) {
  providers.push(Discord);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
