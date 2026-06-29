import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/workspace";
import { z } from "zod";

const SettingsSchema = z.object({
  workStartHour: z.number().int().min(0).max(23).optional(),
  workEndHour: z.number().int().min(0).max(23).optional(),
  timezone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const workspaceId = getWorkspaceId(req);
  const settings = await prisma.userSettings.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
  });
  return Response.json(settings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const workspaceId = getWorkspaceId(req);
  const settings = await prisma.userSettings.upsert({
    where: { workspaceId },
    create: { workspaceId, ...parsed.data },
    update: parsed.data,
  });
  return Response.json(settings);
}
