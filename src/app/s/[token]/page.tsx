import { notFound } from "next/navigation";
import { getSharedDropFile } from "@/lib/dashboard-data";
import { formatBytes, formatDateTime } from "@/lib/utils";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getSharedDropFile(token);

  if (!shared) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
      <div className="panel rounded-[2rem] p-6 md:p-8">
        <div className="text-xs uppercase tracking-[0.28em] text-sky-200/70">Shared file</div>
        <h1 className="hero-title mt-3 text-3xl font-semibold text-white md:text-5xl">{shared.dropFile.originalName}</h1>
        <div className="mt-4 grid gap-3 text-sm text-slate-200/80 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/4 p-4">Type: {shared.dropFile.mimeType}</div>
          <div className="rounded-2xl border border-white/10 bg-white/4 p-4">Size: {formatBytes(shared.dropFile.sizeBytes)}</div>
          <div className="rounded-2xl border border-white/10 bg-white/4 p-4">Expires: {formatDateTime(shared.dropFile.expiresAt)}</div>
          <div className="rounded-2xl border border-white/10 bg-white/4 p-4">Access count: {shared.shareLink.accessCount}</div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="button-primary px-4 py-3 text-sm" href={shared.dropFile.publicUrl} target="_blank" rel="noreferrer">
            Open file
          </a>
          <a className="button-secondary px-4 py-3 text-sm" href={shared.dropFile.publicUrl} download>
            Download
          </a>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          This link is public for retrieval only and may expire or revoke automatically when exhausted.
        </p>
      </div>
    </main>
  );
}
