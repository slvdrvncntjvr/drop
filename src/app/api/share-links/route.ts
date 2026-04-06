import { NextResponse } from "next/server";
import { getAuthSession } from "@/auth";
import { prisma } from "@/lib/db";
import { buildShareToken } from "@/lib/storage";
import { shareLinkCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = shareLinkCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid share link" }, { status: 400 });
  }

  const file = await prisma.dropFile.findFirst({
    where: { id: parsed.data.dropFileId, userId: session.user.id },
  });

  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shareLink = await prisma.shareLink.create({
    data: {
      dropFileId: file.id,
      token: buildShareToken(),
      expiresAt: new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000),
      maxAccessCount: parsed.data.maxAccessCount ?? null,
    },
  });

  return NextResponse.json({
    shareLink: {
      id: shareLink.id,
      token: shareLink.token,
      expiresAt: shareLink.expiresAt.toISOString(),
      accessCount: shareLink.accessCount,
      maxAccessCount: shareLink.maxAccessCount,
    },
  });
}
