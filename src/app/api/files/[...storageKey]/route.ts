import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

function buildStorageKey(parts: string[] | undefined) {
  if (!parts || parts.length === 0) return null;
  return parts.join("/");
}

export async function GET(_: Request, { params }: { params: Promise<{ storageKey: string[] }> }) {
  const { storageKey: parts } = await params;
  const storageKey = buildStorageKey(parts);

  if (!storageKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asset = await prisma.storedObject.findUnique({
    where: { storageKey },
    select: {
      bytes: true,
      mimeType: true,
      originalName: true,
      sizeBytes: true,
      updatedAt: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = Buffer.from(asset.bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": asset.mimeType || "application/octet-stream",
      "Content-Length": String(asset.sizeBytes),
      "Content-Disposition": `inline; filename="${asset.originalName.replace(/\"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
      ETag: `W/\"${asset.updatedAt.getTime()}-${asset.sizeBytes}\"`,
    },
  });
}
