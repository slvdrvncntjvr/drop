"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        setError("Login failed. Check your credentials or rate limit window.");
        return;
      }

      router.push(result.url ?? callbackUrl);
      router.refresh();
    });
  }

  return (
    <form className="panel rounded-[2rem] p-6 md:p-8" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.3em] text-sky-200/70">Owner access</div>
        <h1 className="hero-title text-3xl font-semibold text-white">Sign in to Drop Board</h1>
        <p className="text-sm text-slate-300/75">
          Private owner-only access for clipboard sync, quick file drops, and the unified inbox.
        </p>
      </div>

      <div className="mt-8 grid gap-4">
        <label className="grid gap-2 text-sm text-slate-200/80">
          Email
          <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="grid gap-2 text-sm text-slate-200/80">
          Password
          <input
            className="field"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
      </div>

      {error ? <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</p> : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">No public registration. Owner credentials only.</p>
        <button className="button-primary px-5 py-3 text-sm disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </form>
  );
}