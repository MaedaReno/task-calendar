import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/workspace";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.string().nullable().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "in_progress", "done"]).optional(),
  estimatedHours: z.number().nullable().optional(),
  color: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  const { id } = await ctx.params;
  const task = await prisma.task.findFirst({
    where: { id, workspaceId: getWorkspaceId(req) },
    include: { subtasks: { orderBy: { order: "asc" } } },
  });
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(task);
}

export async function PUT(
  req: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { deadline, startDate, ...rest } = parsed.data;
  // 自ワークスペースのタスクのみ更新を許可
  const owned = await prisma.task.findFirst({
    where: { id, workspaceId: getWorkspaceId(req) },
    select: { id: true },
  });
  if (!owned) return Response.json({ error: "Not found" }, { status: 404 });
  const task = await prisma.task.update({
    where: { id },
    data: {
      ...rest,
      ...(deadline ? { deadline: new Date(deadline) } : {}),
      ...(startDate !== undefined
        ? { startDate: startDate ? new Date(startDate) : null }
        : {}),
    },
    include: { subtasks: { orderBy: { order: "asc" } } },
  });
  return Response.json(task);
}

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  const { id } = await ctx.params;
  // 自ワークスペースのタスクのみ削除（subtask は onDelete: Cascade で連動）
  const res = await prisma.task.deleteMany({
    where: { id, workspaceId: getWorkspaceId(req) },
  });
  if (res.count === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
