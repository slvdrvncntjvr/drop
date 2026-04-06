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
        const ip = "unknown";
        const key = `${ip}:${parsed.data.email.toLowerCase()}`;

        if (!checkRateLimit(key)) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        if (!user || user.role !== "OWNER") {
          return null;
        }

        if (user.email !== env.OWNER_EMAIL) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

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