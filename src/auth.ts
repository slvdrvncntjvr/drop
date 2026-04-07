import bcrypt from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { getRuntimeEnv } from "@/lib/env";
import { loginSchema } from "@/lib/validation";

const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= 5) {
    return false;
  }

  entry.count += 1;
  attempts.set(key, entry);
  return true;
}

function clearRateLimit(key: string) {
  attempts.delete(key);
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const env = getRuntimeEnv();
        const normalizedEmail = parsed.data.email.toLowerCase();
        const ip = "unknown";
        const key = `${ip}:${normalizedEmail}`;

        if (!checkRateLimit(key)) {
          return null;
        }

        // Owner-only guardrail: reject non-owner emails before any DB work.
        if (normalizedEmail !== env.OWNER_EMAIL.toLowerCase()) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          if (parsed.data.password !== env.OWNER_PASSWORD) {
            return null;
          }

          const passwordHash = await bcrypt.hash(env.OWNER_PASSWORD, 12);
          const created = await prisma.user.create({
            data: {
              email: normalizedEmail,
              passwordHash,
              role: "OWNER",
            },
          });

          clearRateLimit(key);

          return {
            id: created.id,
            email: created.email,
            role: created.role,
          };
        }

        if (user.role !== "OWNER") {
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

        // Allow current OWNER_PASSWORD to recover from stale hashes in DB, then sync hash.
        if (!passwordMatches && parsed.data.password === env.OWNER_PASSWORD) {
          const passwordHash = await bcrypt.hash(env.OWNER_PASSWORD, 12);
          await prisma.user.update({ where: { id: user.id }, data: { passwordHash, role: "OWNER" } });

          clearRateLimit(key);

          return {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        }

        if (!passwordMatches) {
          return null;
        }

        clearRateLimit(key);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? "OWNER";
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? "drop-board-dev-secret-change-me",
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}