import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

type BridgeItemWithNote = Prisma.BridgeItemGetPayload<{ include: { note: true } }>;
type DropFileWithShares = Prisma.DropFileGetPayload<{ include: { shareLinks: true } }>;

function mapBridgeItem(item: BridgeItemWithNote) {
  return {
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
  };
}

function mapDropFile(item: DropFileWithShares) {
  const activeShareLink = item.shareLinks.find((shareLink) => !shareLink.revokedAt) ?? null;

  return {
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
    shareLink: activeShareLink
      ? {
          id: activeShareLink.id,
          token: activeShareLink.token,
          expiresAt: activeShareLink.expiresAt.toISOString(),
          accessCount: activeShareLink.accessCount,
          maxAccessCount: activeShareLink.maxAccessCount,
        }
      : null,
  };
}

export async function getBridgeBoardData(userId: string) {
  const items = await prisma.bridgeItem.findMany({
    where: { userId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { note: true },
    take: 100,
  });

  return items.map(mapBridgeItem);
}

export async function getDropBoardData(userId: string) {
  const files = await prisma.dropFile.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      shareLinks: {
        orderBy: { createdAt: "desc" },
      },
    },
    take: 100,
  });

  return files.map(mapDropFile);
}

export async function getInboxBoardData(userId: string) {
  const [bridgeItems, dropFiles] = await Promise.all([
    prisma.bridgeItem.findMany({
      where: { userId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: { note: true },
      take: 100,
    }),
    prisma.dropFile.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        shareLinks: {
          orderBy: { createdAt: "desc" },
        },
      },
      take: 100,
    }),
  ]);

  return {
    bridgeItems: bridgeItems.map(mapBridgeItem),
    dropFiles: dropFiles.map(mapDropFile),
  };
}

export async function getSettingsData(userId: string) {
  const [user, bridgeCount, fileCount, noteCount, shareCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.bridgeItem.count({ where: { userId } }),
    prisma.dropFile.count({ where: { userId } }),
    prisma.savedNote.count({ where: { userId } }),
    prisma.shareLink.count({ where: { dropFile: { userId } } }),
  ]);

  return {
    user: user
      ? {
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        }
      : null,
    counts: {
      bridgeCount,
      fileCount,
      noteCount,
      shareCount,
    },
  };
}

export async function getSharedDropFile(token: string) {
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: { dropFile: true },
  });

  if (!shareLink || shareLink.revokedAt || shareLink.expiresAt.getTime() < Date.now()) {
    return null;
  }

  if (shareLink.dropFile.revokedAt || shareLink.dropFile.expiresAt.getTime() < Date.now()) {
    return null;
  }

  return {
    shareLink: {
      id: shareLink.id,
      token: shareLink.token,
      accessCount: shareLink.accessCount,
      maxAccessCount: shareLink.maxAccessCount,
      expiresAt: shareLink.expiresAt.toISOString(),
    },
    dropFile: {
      id: shareLink.dropFile.id,
      originalName: shareLink.dropFile.originalName,
      publicUrl: shareLink.dropFile.publicUrl,
      mimeType: shareLink.dropFile.mimeType,
      sizeBytes: shareLink.dropFile.sizeBytes,
      expiresAt: shareLink.dropFile.expiresAt.toISOString(),
    },
  };
}

export async function incrementShareAccess(token: string) {
  return prisma.$transaction(async (tx) => {
    const shareLink = await tx.shareLink.findUnique({
      where: { token },
      include: { dropFile: true },
    });

    if (!shareLink || shareLink.revokedAt || shareLink.expiresAt.getTime() < Date.now()) {
      return null;
    }

    if (shareLink.dropFile.revokedAt || shareLink.dropFile.expiresAt.getTime() < Date.now()) {
      return null;
    }

    const nextAccessCount = shareLink.accessCount + 1;
    const exhausted = shareLink.maxAccessCount !== null && nextAccessCount >= shareLink.maxAccessCount;

    const updated = await tx.shareLink.update({
      where: { token },
      data: {
        accessCount: nextAccessCount,
        revokedAt: exhausted ? new Date() : shareLink.revokedAt,
      },
      include: { dropFile: true },
    });

    return {
      shareLink: updated,
      exhausted,
    };
  });
}
