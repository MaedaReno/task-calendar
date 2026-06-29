import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/workspace";

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/templates/[id]">
) {
  const { id } = await ctx.params;
  const res = await prisma.taskTemplate.deleteMany({
    where: { id, workspaceId: getWorkspaceId(req) },
  });
  if (res.count === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
