import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SubTaskSchema = z.object({
  taskId: z.string(),
  title: z.string().min(1),
  estimatedHours: z.number().optional(),
  order: z.number().default(0),
  status: z.enum(["pending", "in_progress", "done"]).default("pending"),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SubTaskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { scheduledStart, scheduledEnd, ...rest } = parsed.data;
  const subtask = await prisma.subTask.create({
    data: {
      ...rest,
      ...(scheduledStart ? { scheduledStart: new Date(scheduledStart) } : {}),
      ...(scheduledEnd ? { scheduledEnd: new Date(scheduledEnd) } : {}),
    },
  });
  return Response.json(subtask, { status: 201 });
}
