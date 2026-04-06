import { getAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { SettingsPanel } from "@/components/settings-panel";
import { getRuntimeEnv } from "@/lib/env";
import { getSettingsData } from "@/lib/dashboard-data";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await getSettingsData(session.user.id);
  const env = getRuntimeEnv();

  return (
    <AppShell activePath="/settings" title="Settings" subtitle="Operational controls" userEmail={session.user.email}>
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="panel rounded-[2rem] p-5">
          <h2 className="text-xl font-semibold text-white">Account</h2>
          <dl className="mt-4 grid gap-3 text-sm text-slate-200/80">
            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <dt className="text-slate-400">Email</dt>
              <dd className="mt-1 text-white">{data.user?.email}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <dt className="text-slate-400">Role</dt>
              <dd className="mt-1 text-white">{data.user?.role}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
              <dt className="text-slate-400">Storage mode</dt>
              <dd className="mt-1 text-white">
                {env.STORAGE_DRIVER ?? (env.S3_BUCKET ? "s3" : process.env.NODE_ENV === "production" ? "db" : "local")}
              </dd>
            </div>
          </dl>
        </section>

        <SettingsPanel cronPath="/api/cron/cleanup" />
      </div>
    </AppShell>
  );
}
