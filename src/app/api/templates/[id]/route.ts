import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/templates/[id]">
) {
  const { id } = await ctx.params;
  await prisma.taskTemplate.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
