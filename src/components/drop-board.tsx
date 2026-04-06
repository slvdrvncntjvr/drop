"use client";

import { useEffect, useState, useTransition } from "react";
import { formatBytes, formatDateTime, timeUntil } from "@/lib/utils";

type DropFile = {
  id: string;
  originalName: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByDevice: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  shareLink: { id: string; token: string; expiresAt: string; accessCount: number; maxAccessCount: number | null } | null;
};

export function DropBoard({ initialFiles }: { initialFiles: DropFile[] }) {
  const [files, setFiles] = useState(initialFiles);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [form, setForm] = useState({ uploadedByDevice: "Phone", expiresInHours: 24, oneTime: false });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  async function refresh() {
    const response = await fetch("/api/drop");
    if (response.ok) {
      const payload = (await response.json()) as DropFile[];
      setFiles(payload);
    }
  }

  useEffect(() => {
    refresh().catch(() => undefined);
    const interval = window.setInterval(() => refresh().catch(() => undefined), 8000);
    return () => window.clearInterval(interval);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      if (!selectedFiles || selectedFiles.length === 0) {
        setMessage("Choose at least one file first.");
        return;
      }

      const formData = new FormData();
      for (const file of Array.from(selectedFiles)) {
        formData.append("files", file);
      }
      formData.set("uploadedByDevice", form.uploadedByDevice);
      formData.set("expiresInHours", String(form.expiresInHours));
      formData.set("oneTime", String(form.oneTime));

      const response = await fetch("/api/drop", { method: "POST", body: formData });
      const payload = await response.json();

      if (!response.ok) {
        setMessage(payload.error ?? "Upload failed.");
        return;
      }

      setFiles((current) => [payload.item, ...current]);
      setMessage("File uploaded and share link created.");
      setSelectedFiles(null);
      await refresh();
    });
  }

  async function revokeFile(id: string) {
    const response = await fetch(`/api/drop/${id}`, { method: "DELETE" });
    if (response.ok) {
      setFiles((current) => current.filter((file) => file.id !== id));
      setMessage("File removed.");
    }
  }

  async function extendFile(id: string) {
    const response = await fetch(`/api/drop/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extendHours: 24 }),
    });

    if (response.ok) {
      setMessage("Expiry extended.");
      await refresh();
    }
  }

  async function createShareLink(id: string, oneTime = false) {
    const response = await fetch("/api/share-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dropFileId: id, expiresInHours: 24, maxAccessCount: oneTime ? 1 : null }),
    });

    const payload = await response.json();
    if (response.ok) {
      setMessage(`Share link created: /s/${payload.shareLink.token}`);
      await refresh();
    }
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/s/${token}`);
    setMessage("Share link copied.");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <section
        className={`panel rounded-[2rem] p-5 transition ${dropActive ? "border-sky-400/40 bg-sky-400/8" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDropActive(false);
          setSelectedFiles(event.dataTransfer.files);
        }}
      >
        <div>
          <h2 className="text-xl font-semibold text-white">Quick Drop</h2>
          <p className="text-sm text-slate-300/70">Drag files in, or use the mobile-friendly uploader.</p>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm text-slate-200/80">
            Files
            <input className="field" type="file" multiple onChange={(event) => setSelectedFiles(event.target.files)} />
          </label>
          <label className="grid gap-2 text-sm text-slate-200/80">
            Device
            <input className="field" value={form.uploadedByDevice} onChange={(event) => setForm((current) => ({ ...current, uploadedByDevice: event.target.value }))} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm text-slate-200/80">
              Expiry hours
              <input className="field" type="number" min={1} max={168} value={form.expiresInHours} onChange={(event) => setForm((current) => ({ ...current, expiresInHours: Number(event.target.value) }))} />
            </label>
            <label className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/4 p-4 text-sm text-slate-200/80">
              <input checked={form.oneTime} type="checkbox" onChange={(event) => setForm((current) => ({ ...current, oneTime: event.target.checked }))} />
              One-time link
            </label>
          </div>
          <button className="button-primary px-4 py-3 text-sm disabled:opacity-60" disabled={pending} type="submit">
            {pending ? "Uploading..." : "Upload & create link"}
          </button>
        </form>

        {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100">{message}</p> : null}
      </section>

      <section className="panel rounded-[2rem] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">File drop inbox</h2>
            <p className="text-sm text-slate-300/70">Files, metadata, and public share links with expiry.</p>
          </div>
          <button id="copy-mode-trigger" className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => void navigator.clipboard.writeText("Quick copy mode active")}>c Quick copy</button>
        </div>

        <div className="mt-5 grid gap-3">
          {files.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/3 p-8 text-center text-sm text-slate-300/70">
              No files uploaded yet.
            </div>
          ) : null}

          {files.map((file) => (
            <article key={file.id} className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{file.originalName}</h3>
                  <p className="text-sm text-slate-300/70">{file.mimeType}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>{file.uploadedByDevice}</div>
                  <div>{formatDateTime(file.createdAt)}</div>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-200/80 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">Size: {formatBytes(file.sizeBytes)}</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">Expires in {timeUntil(file.expiresAt)}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a className="button-secondary px-3 py-2 text-sm" href={file.publicUrl} target="_blank" rel="noreferrer">
                  Open file
                </a>
                <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => copyLink(file.shareLink?.token ?? "")} disabled={!file.shareLink}>
                  Copy share link
                </button>
                <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => createShareLink(file.id)}>
                  New link
                </button>
                <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => createShareLink(file.id, true)}>
                  One-time link
                </button>
                <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => extendFile(file.id)}>
                  Extend expiry
                </button>
                <button className="button-danger px-3 py-2 text-sm" type="button" onClick={() => revokeFile(file.id)}>
                  Revoke
                </button>
              </div>
              {file.shareLink ? (
                <p className="mt-3 mono rounded-2xl border border-sky-400/20 bg-sky-400/8 p-3 text-xs text-sky-100">
                  /s/{file.shareLink.token} · access {file.shareLink.accessCount}
                  {file.shareLink.maxAccessCount ? ` / ${file.shareLink.maxAccessCount}` : ""}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}