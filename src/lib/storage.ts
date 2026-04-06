import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { getRuntimeEnv } from "@/lib/env";

const LOCAL_UPLOAD_ROOT = join(process.cwd(), "public", "uploads");

function createS3Client() {
  const env = getRuntimeEnv();

  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error("S3 storage is not configured");
  }

  return new S3Client({
    region: env.S3_REGION ?? "us-east-1",
    endpoint: env.S3_ENDPOINT,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: Boolean(env.S3_ENDPOINT),
  });
}

function getStorageMode() {
  const env = process.env;
  const configuredDriver = env.STORAGE_DRIVER;
  if (configuredDriver) return configuredDriver;
  if (env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) return "s3";
  return process.env.NODE_ENV === "production" ? "db" : "local";
}

export type StoredAsset = {
  storageKey: string;
  publicUrl: string;
  sizeBytes: number;
  mimeType: string;
  originalName: string;
};

export async function storeFile(file: File, folder: string): Promise<StoredAsset> {
  const mode = getStorageMode();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storageKey = `${folder}/${randomUUID()}-${safeName}`;
  const mimeType = file.type || "application/octet-stream";
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  if (mode === "s3") {
    const env = getRuntimeEnv();
    const client = createS3Client();
    const body = Buffer.from(await file.arrayBuffer());

    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storageKey,
        Body: body,
        ContentType: mimeType,
      }),
    );

    return {
      storageKey,
      publicUrl: env.S3_PUBLIC_BASE_URL
        ? new URL(storageKey, `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/`).toString()
        : `${storageKey}`,
      sizeBytes: file.size,
      mimeType,
      originalName: file.name,
    };
  }

  if (mode === "db") {
    await prisma.storedObject.upsert({
      where: { storageKey },
      update: {
        bytes: fileBuffer,
        mimeType,
        originalName: file.name,
        sizeBytes: file.size,
      },
      create: {
        storageKey,
        bytes: fileBuffer,
        mimeType,
        originalName: file.name,
        sizeBytes: file.size,
      },
    });

    return {
      storageKey,
      publicUrl: `/api/files/${storageKey}`,
      sizeBytes: file.size,
      mimeType,
      originalName: file.name,
    };
  }

  const filePath = join(LOCAL_UPLOAD_ROOT, storageKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, fileBuffer);

  return {
    storageKey,
    publicUrl: `/uploads/${storageKey}`,
    sizeBytes: file.size,
    mimeType,
    originalName: file.name,
  };
}

export async function deleteStoredFile(storageKey: string) {
  const mode = getStorageMode();

  if (mode === "s3") {
    const env = getRuntimeEnv();
    const client = createS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: storageKey,
      }),
    );
    return;
  }

  if (mode === "db") {
    await prisma.storedObject.deleteMany({ where: { storageKey } });
    return;
  }

  await unlink(join(LOCAL_UPLOAD_ROOT, storageKey)).catch(() => undefined);
}

export function buildShareToken() {
  return randomUUID().replace(/-/g, "").slice(0, 16);
}