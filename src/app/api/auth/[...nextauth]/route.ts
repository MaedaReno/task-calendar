import { handlers } from "@/auth";

// PrismaAdapter は Node.js ランタイムが必要
export const runtime = "nodejs";

export const { GET, POST } = handlers;
