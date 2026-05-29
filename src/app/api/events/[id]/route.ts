import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
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
  _req: NextRequest,
  ctx: RouteContext<"/api/events/[id]">
) {
  const { id } = await ctx.params;
  await prisma.event.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
