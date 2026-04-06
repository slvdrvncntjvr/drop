import { NextResponse } from "next/server";
import { getAuthSession } from "@/auth";
import { prisma } from "@/lib/db";
import { storeFile } from "@/lib/storage";
import { bridgeSearchSchema, bridgeItemInputSchema } from "@/lib/validation";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = bridgeSearchSchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    pinned: url.searchParams.get("pinned") ?? undefined,
    favorite: url.searchParams.get("favorite") ?? undefined,
  });

  const filters = parsed.success ? parsed.data : { q: undefined, type: "all", pinned: undefined, favorite: undefined };
  const itemType = parsed.success && parsed.data.type !== "all" ? (parsed.data.type as "text" | "code" | "link" | "image") : undefined;

  const where: Prisma.BridgeItemWhereInput = {
    userId: session.user.id,
    ...(filters.pinned ? { isPinned: true } : {}),
    ...(filters.favorite ? { isFavorite: true } : {}),
    ...(itemType ? { type: itemType } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" } },
            { content: { contains: filters.q, mode: "insensitive" } },
            { tags: { hasSome: [filters.q] } },
          ],
        }
      : {}),
  };

  const items = await prisma.bridgeItem.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { note: true },
    take: 100,
  });

  return NextResponse.json(
    items.map((item) => ({
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
  );
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const rawType = String(formData.get("type") ?? "text");
  const rawTitle = String(formData.get("title") ?? "");
  const rawContent = String(formData.get("content") ?? "");
  const rawTags = String(formData.get("tags") ?? "");
  const rawPinned = String(formData.get("isPinned") ?? "false");
  const rawFavorite = String(formData.get("isFavorite") ?? "false");
  const sourceDevice = String(formData.get("sourceDevice") ?? "Unknown device");
  const file = formData.get("file");

  let content = rawContent;
  let title = rawTitle;
  let type = rawType;

  if (file instanceof File && file.size > 0) {
    const stored = await storeFile(file, "bridge");
    content = stored.publicUrl;
    type = "image";
    if (!title.trim()) {
      title = file.name;
    }
  }

  const parsed = bridgeItemInputSchema.safeParse({
    type,
    title,
    content,
    tags: rawTags.split(",").map((entry) => entry.trim()).filter(Boolean),
    isPinned: rawPinned === "true",
    isFavorite: rawFavorite === "true",
    sourceDevice,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid bridge item" }, { status: 400 });
  }

  const item = await prisma.bridgeItem.create({
    data: {
      ...parsed.data,
      userId: session.user.id,
    },
  });

  return NextResponse.json({
    item: {
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
      noteId: null,
    },
  });
}
