import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId, unauthorized } from "@/lib/workspace";

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/templates/[id]">
) {
  const { id } = await ctx.params;
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return unauthorized();
  const res = await prisma.taskTemplate.deleteMany({
    where: { id, workspaceId },
  });
  if (res.count === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
