import { z } from "zod";

const runtimeEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  OWNER_EMAIL: z.string().email(),
  OWNER_PASSWORD: z.string().min(8),
  STORAGE_DRIVER: z.enum(["s3", "local", "db"]).optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(16).optional(),
});

export function getRuntimeEnv() {
  const parsed = runtimeEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${messages.join("\n")}`);
  }

  return parsed.data;
}

export type RuntimeEnv = ReturnType<typeof getRuntimeEnv>;