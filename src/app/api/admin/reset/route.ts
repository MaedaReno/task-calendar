import { prisma } from "@/lib/prisma";

export async function DELETE() {
  await prisma.subTask.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.event.deleteMany({});
  return new Response(null, { status: 204 });
}
