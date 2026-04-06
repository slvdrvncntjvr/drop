import { NextResponse } from "next/server";
import { getAuthSession } from "@/auth";
import { prisma } from "@/lib/db";
import { bridgeItemPatchSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = bridgeItemPatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update" }, { status: 400 });
  }

  const item = await prisma.bridgeItem.update({
    where: { id, userId: session.user.id },
    data: parsed.data,
  });

  return NextResponse.json({ item });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.bridgeItem.delete({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
