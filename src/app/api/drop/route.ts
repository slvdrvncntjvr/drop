import { NextResponse } from "next/server";
import { getAuthSession } from "@/auth";
import { prisma } from "@/lib/db";
import { buildShareToken, storeFile } from "@/lib/storage";
import { dropUploadSchema, fileMimeAllowList } from "@/lib/validation";

function isVideoMime(mimeType: string) {
  return mimeType.startsWith("video/");
}

function maxSizeForMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return 25 * 1024 * 1024;
  if (mimeType.startsWith("audio/")) return 50 * 1024 * 1024;
  if (isVideoMime(mimeType)) return 200 * 1024 * 1024;
  return 50 * 1024 * 1024;
}

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const files = await prisma.dropFile.findMany({
    where: { userId: session.user.id },
    orderBy: [{ createdAt: "desc" }],
    include: { shareLinks: { orderBy: { createdAt: "desc" } } },
    take: 100,
  });

  return NextResponse.json(
    files.map((item) => ({
      id: item.id,
      originalName: item.originalName,
      storageKey: item.storageKey,
      publicUrl: item.publicUrl,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      uploadedByDevice: item.uploadedByDevice,
      expiresAt: item.expiresAt.toISOString(),
      revokedAt: item.revokedAt ? item.revokedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      shareLink: item.shareLinks[0]
        ? {
            id: item.shareLinks[0].id,
            token: item.shareLinks[0].token,
            expiresAt: item.shareLinks[0].expiresAt.toISOString(),
            accessCount: item.shareLinks[0].accessCount,
            maxAccessCount: item.shareLinks[0].maxAccessCount,
          }
        : null,
    })),
  );
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  const parsed = dropUploadSchema.safeParse({
    uploadedByDevice: String(formData.get("uploadedByDevice") ?? "Unknown device"),
    expiresInHours: formData.get("expiresInHours") ?? 24,
    oneTime: formData.get("oneTime") ?? false,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid upload" }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
  }

  const primaryFile = files[0];
  if (!fileMimeAllowList.has(primaryFile.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  if (primaryFile.size > maxSizeForMime(primaryFile.type)) {
    return NextResponse.json({ error: "File is too large" }, { status: 400 });
  }

  const stored = await storeFile(primaryFile, "drop");
  const dropFile = await prisma.dropFile.create({
    data: {
      originalName: stored.originalName,
      storageKey: stored.storageKey,
      publicUrl: stored.publicUrl,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      uploadedByDevice: parsed.data.uploadedByDevice,
      expiresAt: new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000),
      userId: session.user.id,
    },
  });

  const shareLink = await prisma.shareLink.create({
    data: {
      dropFileId: dropFile.id,
      token: buildShareToken(),
      expiresAt: dropFile.expiresAt,
      maxAccessCount: parsed.data.oneTime ? 1 : null,
    },
  });

  return NextResponse.json({
    item: {
      id: dropFile.id,
      originalName: dropFile.originalName,
      storageKey: dropFile.storageKey,
      publicUrl: dropFile.publicUrl,
      mimeType: dropFile.mimeType,
      sizeBytes: dropFile.sizeBytes,
      uploadedByDevice: dropFile.uploadedByDevice,
      expiresAt: dropFile.expiresAt.toISOString(),
      revokedAt: null,
      createdAt: dropFile.createdAt.toISOString(),
      updatedAt: dropFile.updatedAt.toISOString(),
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        expiresAt: shareLink.expiresAt.toISOString(),
        accessCount: shareLink.accessCount,
        maxAccessCount: shareLink.maxAccessCount,
      },
    },
  });
}
