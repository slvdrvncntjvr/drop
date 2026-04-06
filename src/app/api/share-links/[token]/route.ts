import { NextResponse } from "next/server";
import { getAuthSession } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteStoredFile } from "@/lib/storage";
import { incrementShareAccess } from "@/lib/dashboard-data";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const result = await incrementShareAccess(token);
  if (!result) {
    return NextResponse.json({ error: "Link expired or revoked" }, { status: 410 });
  }

  return NextResponse.json({
    shareLink: {
      token: result.shareLink.token,
      accessCount: result.shareLink.accessCount,
      maxAccessCount: result.shareLink.maxAccessCount,
      expiresAt: result.shareLink.expiresAt.toISOString(),
      exhausted: result.exhausted,
    },
    dropFile: {
      id: result.shareLink.dropFile.id,
      originalName: result.shareLink.dropFile.originalName,
      publicUrl: result.shareLink.dropFile.publicUrl,
      mimeType: result.shareLink.dropFile.mimeType,
      sizeBytes: result.shareLink.dropFile.sizeBytes,
      expiresAt: result.shareLink.dropFile.expiresAt.toISOString(),
    },
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const shareLink = await prisma.shareLink.findFirst({
    where: { token, dropFile: { userId: session.user.id } },
    include: { dropFile: true },
  });

  if (!shareLink) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteStoredFile(shareLink.dropFile.storageKey).catch(() => undefined);

  await prisma.shareLink.update({
    where: { token },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
