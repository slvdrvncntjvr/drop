import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteStoredFile } from "@/lib/storage";
import { getRuntimeEnv } from "@/lib/env";

async function runCleanup() {
  const now = new Date();

  const expiredFiles = await prisma.dropFile.findMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
    },
    take: 250,
  });

  const expiredLinks = await prisma.shareLink.findMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
    },
    take: 500,
  });

  for (const file of expiredFiles) {
    await deleteStoredFile(file.storageKey).catch(() => undefined);
  }

  await prisma.$transaction([
    prisma.shareLink.deleteMany({ where: { id: { in: expiredLinks.map((item: { id: string }) => item.id) } } }),
    prisma.shareLink.deleteMany({ where: { dropFileId: { in: expiredFiles.map((item: { id: string }) => item.id) } } }),
    prisma.dropFile.deleteMany({ where: { id: { in: expiredFiles.map((item: { id: string }) => item.id) } } }),
  ]);

  return {
    removedFiles: expiredFiles.length,
    removedLinks: expiredLinks.length,
  };
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  const env = getRuntimeEnv();
  const providedSecret = request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret") ?? "";

  if (!env.CRON_SECRET || providedSecret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCleanup();
  return NextResponse.json(result);
}
