import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "in_progress", "done"]).optional(),
  estimatedHours: z.number().nullable().optional(),
  color: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  const { id } = await ctx.params;
  const task = await prisma.task.findUnique({
    where: { id },
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
  const { deadline, ...rest } = parsed.data;
  const task = await prisma.task.update({
    where: { id },
    data: {
      ...rest,
      ...(deadline ? { deadline: new Date(deadline) } : {}),
    },
    include: { subtasks: { orderBy: { order: "asc" } } },
  });
  return Response.json(task);
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<"/api/tasks/[id]">
) {
  const { id } = await ctx.params;
  await prisma.task.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
