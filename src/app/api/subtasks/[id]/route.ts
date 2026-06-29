import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/workspace";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  estimatedHours: z.number().nullable().optional(),
  order: z.number().optional(),
  status: z.enum(["pending", "in_progress", "done"]).optional(),
  scheduledStart: z.string().nullable().optional(),
  scheduledEnd: z.string().nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  ctx: RouteContext<"/api/subtasks/[id]">
) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  // 親タスク経由で自ワークスペースのサブタスクか検証
  const owned = await prisma.subTask.findFirst({
    where: { id, task: { workspaceId: getWorkspaceId(req) } },
    select: { id: true },
  });
  if (!owned) return Response.json({ error: "Not found" }, { status: 404 });
  const { scheduledStart, scheduledEnd, ...rest } = parsed.data;
  const subtask = await prisma.subTask.update({
    where: { id },
    data: {
      ...rest,
      ...(scheduledStart !== undefined
        ? { scheduledStart: scheduledStart ? new Date(scheduledStart) : null }
        : {}),
      ...(scheduledEnd !== undefined
        ? { scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null }
        : {}),
    },
  });
  return Response.json(subtask);
}

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/subtasks/[id]">
) {
  const { id } = await ctx.params;
  // 親タスク経由で自ワークスペースのサブタスクのみ削除
  const owned = await prisma.subTask.findFirst({
    where: { id, task: { workspaceId: getWorkspaceId(req) } },
    select: { id: true },
  });
  if (!owned) return Response.json({ error: "Not found" }, { status: 404 });
  await prisma.subTask.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
