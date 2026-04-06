import { z } from "zod";

export const deviceNameSchema = z.string().trim().min(1).max(60);

export const bridgeItemTypeSchema = z.enum(["text", "code", "link", "image"]);

export const bridgeItemInputSchema = z.object({
  type: bridgeItemTypeSchema,
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(10_000),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).default([]),
  isPinned: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  sourceDevice: deviceNameSchema,
});

export const bridgeItemPatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  content: z.string().trim().min(1).max(10_000).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).optional(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
});

export const noteFromBridgeSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(10_000),
});

export const dropUploadSchema = z.object({
  uploadedByDevice: deviceNameSchema,
  expiresInHours: z.coerce.number().int().min(1).max(168).default(24),
  oneTime: z.coerce.boolean().default(false),
});

export const shareLinkCreateSchema = z.object({
  dropFileId: z.string().trim().min(1),
  expiresInHours: z.coerce.number().int().min(1).max(168).default(24),
  maxAccessCount: z.coerce.number().int().min(1).max(100).nullable().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
});

export const filterSchema = z.object({
  search: z.string().trim().optional(),
  type: z.enum(["text", "links", "images", "files", "code", "pinned", "expiring-soon"]).optional(),
});

export const fileMimeAllowList = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/zip",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export const bridgeSearchSchema = z.object({
  q: z.string().trim().optional(),
  type: z.enum(["text", "code", "link", "image", "all"]).default("all"),
  pinned: z.coerce.boolean().optional(),
  favorite: z.coerce.boolean().optional(),
});