import { NextResponse } from "next/server";
import { getAuthSession } from "@/auth";
import { prisma } from "@/lib/db";

type InboxFilter = "all" | "text" | "links" | "images" | "files" | "code" | "pinned" | "expiring-soon";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "all";
  const search = url.searchParams.get("search") ?? "";

  const [bridgeItems, dropFiles] = await Promise.all([
    prisma.bridgeItem.findMany({
      where: {
        userId: session.user.id,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { content: { contains: search, mode: "insensitive" } },
                { tags: { hasSome: [search] } },
              ],
            }
          : {}),
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: { note: true },
      take: 100,
    }),
    prisma.dropFile.findMany({
      where: {
        userId: session.user.id,
        ...(search ? { originalName: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: [{ createdAt: "desc" }],
      include: { shareLinks: { orderBy: { createdAt: "desc" } } },
      take: 100,
    }),
  ]);

  const response = {
    bridgeItems: bridgeItems
      .filter((item) => {
        if (filter === "all") return true;
        if (filter === "pinned") return item.isPinned;
        if (filter === "code") return item.type === "code";
        if (filter === "text") return item.type === "text";
        if (filter === "links") return item.type === "link";
        if (filter === "images") return item.type === "image";
        return true;
      })
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.content,
        tags: item.tags,
        isPinned: item.isPinned,
        isFavorite: item.isFavorite,
        sourceDevice: item.sourceDevice,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        noteId: item.note?.id ?? null,
      })),
    dropFiles: dropFiles
      .filter((item) => {
        if (filter === "files") return true;
        if (filter === "expiring-soon") return item.expiresAt.getTime() - Date.now() < 6 * 60 * 60 * 1000;
        if (filter === "images") return item.mimeType.startsWith("image/");
        return filter === "all" || filter === "files" || filter === "expiring-soon";
      })
      .map((item) => ({
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
              token: item.shareLinks[0].token,
              expiresAt: item.shareLinks[0].expiresAt.toISOString(),
              accessCount: item.shareLinks[0].accessCount,
              maxAccessCount: item.shareLinks[0].maxAccessCount,
            }
          : null,
      })),
  };

  return NextResponse.json(response);
}
