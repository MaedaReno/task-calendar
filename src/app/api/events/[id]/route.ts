import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId, unauthorized } from "@/lib/workspace";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  allDay: z.boolean().optional(),
  color: z.string().optional(),
  location: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  ctx: RouteContext<"/api/events/[id]">
) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { start, end, ...rest } = parsed.data;
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return unauthorized();
  // 自ワークスペースの予定のみ更新を許可
  const owned = await prisma.event.findFirst({
    where: { id, workspaceId },
    select: { id: true },
  });
  if (!owned) return Response.json({ error: "Not found" }, { status: 404 });
  const event = await prisma.event.update({
    where: { id },
    data: {
      ...rest,
      ...(start ? { start: new Date(start) } : {}),
      ...(end ? { end: new Date(end) } : {}),
    },
  });
  return Response.json(event);
}

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/events/[id]">
) {
  const { id } = await ctx.params;
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return unauthorized();
  // 自ワークスペースの予定のみ削除（他人のデータは消せない）
  const res = await prisma.event.deleteMany({
    where: { id, workspaceId },
  });
  if (res.count === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
