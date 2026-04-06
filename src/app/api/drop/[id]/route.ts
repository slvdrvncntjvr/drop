import { NextResponse } from "next/server";
import { getAuthSession } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteStoredFile } from "@/lib/storage";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const extendHours = Number(body.extendHours ?? 0);

  if (!Number.isFinite(extendHours) || extendHours <= 0) {
    return NextResponse.json({ error: "extendHours must be a positive number" }, { status: 400 });
  }

  const current = await prisma.dropFile.findFirst({ where: { id, userId: session.user.id } });
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const expiresAt = new Date(current.expiresAt.getTime() + extendHours * 60 * 60 * 1000);

  const updated = await prisma.dropFile.update({
    where: { id },
    data: {
      expiresAt,
      shareLinks: {
        updateMany: {
          where: { revokedAt: null },
          data: { expiresAt },
        },
      },
    },
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const file = await prisma.dropFile.findFirst({ where: { id, userId: session.user.id }, include: { shareLinks: true } });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteStoredFile(file.storageKey).catch(() => undefined);

  await prisma.$transaction([
    prisma.shareLink.deleteMany({ where: { dropFileId: id } }),
    prisma.dropFile.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
