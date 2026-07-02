import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId, unauthorized } from "@/lib/workspace";

export async function DELETE(req: NextRequest) {
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return unauthorized();
  // 自ワークスペースのデータのみ削除する（SubTask は親Task経由で限定）
  await prisma.subTask.deleteMany({ where: { task: { workspaceId } } });
  await prisma.task.deleteMany({ where: { workspaceId } });
  await prisma.event.deleteMany({ where: { workspaceId } });
  return new Response(null, { status: 204 });
}
