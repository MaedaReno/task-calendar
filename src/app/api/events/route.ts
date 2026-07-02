import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId, unauthorized } from "@/lib/workspace";
import { z } from "zod";

const EventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean().optional().default(false),
  color: z.string().optional().default("#3b82f6"),
  location: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return unauthorized();

  const events = await prisma.event.findMany({
    where: {
      workspaceId,
      ...(from && to
        ? { start: { gte: new Date(from) }, end: { lte: new Date(to) } }
        : {}),
    },
    orderBy: { start: "asc" },
  });
  return Response.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return unauthorized();
  const event = await prisma.event.create({
    data: {
      ...parsed.data,
      workspaceId,
      start: new Date(parsed.data.start),
      end: new Date(parsed.data.end),
    },
  });
  return Response.json(event, { status: 201 });
}
