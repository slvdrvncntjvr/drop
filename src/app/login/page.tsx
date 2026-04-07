import { getAuthSession } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { getRuntimeEnv } from "@/lib/env";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const session = await getAuthSession();
  if (session?.user?.id) {
    redirect("/bridge");
  }

  const params = await searchParams;
  const callbackUrl = params.from ?? "/bridge";
  const env = getRuntimeEnv();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex flex-col justify-between gap-8 rounded-[2rem] border border-white/10 bg-white/4 p-8 shadow-2xl backdrop-blur-xl md:p-10">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs uppercase tracking-[0.26em] text-sky-100/80">
              Private owner workspace
            </div>
            <h2 className="hero-title max-w-2xl text-4xl font-semibold text-white md:text-6xl">
              Clipboard bridge, file drop, and inbox in one place.
            </h2>
            <p className="max-w-xl text-base text-slate-300/80 md:text-lg">
              Drop Board keeps your phone and PC connected with fast clipboard sync, short-lived file sharing, and a single timeline for everything that matters.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300/75 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Owner-only login at /login</div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Secure sessions and CSRF-safe auth</div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Cron-ready cleanup and share links</div>
          </div>
        </section>
        <div className="self-center">
          <LoginForm callbackUrl={callbackUrl} ownerEmail={env.OWNER_EMAIL} />
        </div>
      </div>
    </main>
  );
}
