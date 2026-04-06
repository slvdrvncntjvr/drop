import { NextResponse } from "next/server";
import { getAuthSession } from "@/auth";
import { prisma } from "@/lib/db";
import { noteFromBridgeSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bridgeItem = await prisma.bridgeItem.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!bridgeItem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = noteFromBridgeSchema.safeParse({ title: bridgeItem.title, content: bridgeItem.content });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid note" }, { status: 400 });
  }

  const savedNote = await prisma.savedNote.upsert({
    where: { bridgeItemId: id },
    update: {
      title: parsed.data.title,
      content: parsed.data.content,
      tags: bridgeItem.tags,
      sourceDevice: bridgeItem.sourceDevice,
      userId: session.user.id,
    },
    create: {
      bridgeItemId: id,
      title: parsed.data.title,
      content: parsed.data.content,
      tags: bridgeItem.tags,
      sourceDevice: bridgeItem.sourceDevice,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ savedNote });
}
