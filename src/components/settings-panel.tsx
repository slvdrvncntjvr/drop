"use client";

import { useState } from "react";

export function SettingsPanel({ cronPath }: { cronPath: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function runCleanup() {
    setRunning(true);
    setMessage(null);
    try {
      const response = await fetch(cronPath, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Cleanup failed.");
      } else {
        setMessage(`Cleanup complete. Removed ${payload.removedFiles} file(s) and ${payload.removedLinks} link(s).`);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="panel rounded-[2rem] p-5">
        <h2 className="text-xl font-semibold text-white">Operations</h2>
        <p className="mt-2 text-sm text-slate-300/70">Use this panel to verify the scheduled cleanup job and review the runtime checklist.</p>
        <button className="button-primary mt-5 px-4 py-3 text-sm disabled:opacity-60" disabled={running} onClick={runCleanup} type="button">
          {running ? "Running cleanup..." : "Run cleanup now"}
        </button>
        {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100">{message}</p> : null}
      </div>

      <div className="panel rounded-[2rem] p-5">
        <h2 className="text-xl font-semibold text-white">Deployment checklist</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-300/80">
          <li>Confirm `DATABASE_URL` points to Postgres.</li>
          <li>Set `NEXTAUTH_SECRET`, `OWNER_EMAIL`, and `OWNER_PASSWORD`.</li>
          <li>Choose storage mode: `STORAGE_DRIVER=db` (database), `s3`, or `local`.</li>
          <li>Configure Vercel cron or an external scheduler for the cleanup route.</li>
        </ul>
      </div>
    </div>
  );
}