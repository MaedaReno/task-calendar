import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/workspace";
import { z } from "zod";

const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  deadline: z.string(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["pending", "in_progress", "done"]).default("pending"),
  estimatedHours: z.number().optional(),
  color: z.string().optional().default("#8b5cf6"),
  templateId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const tasks = await prisma.task.findMany({
    where: { workspaceId: await getWorkspaceId(req) },
    include: { subtasks: { orderBy: { order: "asc" } } },
    orderBy: { deadline: "asc" },
  });
  return Response.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = TaskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { startDate, ...taskRest } = parsed.data;
  const task = await prisma.task.create({
    data: {
      ...taskRest,
      workspaceId: await getWorkspaceId(req),
      deadline: new Date(parsed.data.deadline),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
    },
    include: { subtasks: true },
  });
  return Response.json(task, { status: 201 });
}
