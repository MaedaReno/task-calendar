import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SubtaskTemplateSchema = z.object({
  title: z.string(),
  estimatedHours: z.number().optional(),
});

const TemplateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  estimatedHours: z.number().optional(),
  defaultSubtasks: z.array(SubtaskTemplateSchema).default([]),
});

export async function GET() {
  const templates = await prisma.taskTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(
    templates.map((t) => ({
      ...t,
      defaultSubtasks: JSON.parse(t.defaultSubtasks),
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = TemplateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const template = await prisma.taskTemplate.create({
    data: {
      ...parsed.data,
      defaultSubtasks: JSON.stringify(parsed.data.defaultSubtasks),
    },
  });
  return Response.json(
    { ...template, defaultSubtasks: parsed.data.defaultSubtasks },
    { status: 201 }
  );
}
