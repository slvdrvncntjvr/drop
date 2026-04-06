"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime, formatBytes, timeUntil } from "@/lib/utils";

type InboxData = {
  bridgeItems: Array<{
    id: string;
    type: string;
    title: string;
    content: string;
    tags: string[];
    isPinned: boolean;
    isFavorite: boolean;
    sourceDevice: string;
    createdAt: string;
    updatedAt: string;
    noteId: string | null;
  }>;
  dropFiles: Array<{
    id: string;
    originalName: string;
    publicUrl: string;
    mimeType: string;
    sizeBytes: number;
    uploadedByDevice: string;
    expiresAt: string;
    revokedAt: string | null;
    createdAt: string;
    updatedAt: string;
    shareLink: { token: string; expiresAt: string; accessCount: number; maxAccessCount: number | null } | null;
  }>;
};

type Filter = "all" | "text" | "links" | "images" | "files" | "code" | "pinned" | "expiring-soon";

const filterMap: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "text", label: "Text" },
  { key: "links", label: "Links" },
  { key: "images", label: "Images" },
  { key: "files", label: "Files" },
  { key: "code", label: "Code" },
  { key: "pinned", label: "Pinned" },
  { key: "expiring-soon", label: "Expiring soon" },
];

export function InboxBoard({ initialData }: { initialData: InboxData }) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const params = new URLSearchParams();
    params.set("filter", filter);
    if (search) params.set("search", search);
    const response = await fetch(`/api/inbox?${params.toString()}`);
    if (response.ok) {
      const payload = (await response.json()) as InboxData;
      setData(payload);
    }
  }

  useEffect(() => {
    refresh().catch(() => undefined);
    const interval = window.setInterval(() => refresh().catch(() => undefined), 7000);
    return () => window.clearInterval(interval);
  }, [filter, search]);

  const items = useMemo(() => {
    const bridgeItems = data.bridgeItems.map((item) => ({ kind: "bridge" as const, ...item }));
    const dropFiles = data.dropFiles.map((item) => ({ kind: "file" as const, ...item }));
    return [...bridgeItems, ...dropFiles].filter((item) => {
      const haystack = `${"title" in item ? item.title : item.originalName} ${"content" in item ? item.content : item.publicUrl}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());

      if (filter === "all") return matchesSearch;
      if (filter === "pinned") return matchesSearch && item.kind === "bridge" && item.isPinned;
      if (filter === "code") return matchesSearch && item.kind === "bridge" && item.type === "code";
      if (filter === "text") return matchesSearch && item.kind === "bridge" && item.type === "text";
      if (filter === "links") return matchesSearch && item.kind === "bridge" && item.type === "link";
      if (filter === "images") return matchesSearch && (item.kind === "bridge" ? item.type === "image" : item.mimeType.startsWith("image/"));
      if (filter === "files") return matchesSearch && item.kind === "file";
      if (filter === "expiring-soon") {
        return matchesSearch && item.kind === "file" && new Date(item.expiresAt).getTime() - Date.now() < 6 * 60 * 60 * 1000;
      }

      return matchesSearch;
    });
  }, [data, filter, search]);

  async function bulkDelete() {
    const bridgeIds = data.bridgeItems.filter((item) => selectedIds.includes(item.id)).map((item) => item.id);
    const fileIds = data.dropFiles.filter((item) => selectedIds.includes(item.id)).map((item) => item.id);

    await Promise.all([
      ...bridgeIds.map((id) => fetch(`/api/bridge/${id}`, { method: "DELETE" })),
      ...fileIds.map((id) => fetch(`/api/drop/${id}`, { method: "DELETE" })),
    ]);

    setSelectedIds([]);
    setMessage("Selected items deleted.");
    await refresh();
  }

  async function bulkExtend() {
    const fileIds = data.dropFiles.filter((item) => selectedIds.includes(item.id)).map((item) => item.id);

    await Promise.all(
      fileIds.map((id) =>
        fetch(`/api/drop/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extendHours: 24 }),
        }),
      ),
    );

    setSelectedIds([]);
    setMessage("Expiry extended for selected files.");
    await refresh();
  }

  async function copyAllLinks() {
    const links = data.dropFiles
      .filter((item) => selectedIds.includes(item.id) && item.shareLink)
      .map((item) => `${window.location.origin}/s/${item.shareLink?.token}`);

    await navigator.clipboard.writeText(links.join("\n"));
    setMessage("Selected share links copied.");
  }

  return (
    <div className="panel rounded-[2rem] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Unified inbox</h2>
          <p className="text-sm text-slate-300/70">Combined clipboard items and file drops with quick filtering.</p>
        </div>
        <div className="grid gap-3 lg:min-w-[460px]">
          <input id="global-search" className="field" placeholder="Search inbox..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            {filterMap.map((item) => (
              <button key={item.key} className={item.key === filter ? "chip-active rounded-full px-3 py-2 text-sm" : "chip rounded-full px-3 py-2 text-sm"} type="button" onClick={() => setFilter(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={bulkDelete} disabled={selectedIds.length === 0}>
          Delete
        </button>
        <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={bulkExtend} disabled={selectedIds.length === 0}>
          Extend expiry
        </button>
        <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={copyAllLinks} disabled={selectedIds.length === 0}>
          Copy all links
        </button>
      </div>

      {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100">{message}</p> : null}

      <div className="mt-5 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/3 p-8 text-center text-sm text-slate-300/70">
            No matching items.
          </div>
        ) : null}

        {items.map((item) => (
          <article key={`${item.kind}-${item.id}`} className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => setSelectedIds((current) => (event.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id)))} />
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-sky-200/70">{item.kind}</div>
                  <h3 className="mt-2 text-lg font-semibold text-white">{"title" in item ? item.title : item.originalName}</h3>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>{item.kind === "bridge" ? item.sourceDevice : item.uploadedByDevice}</div>
                <div>{formatDateTime(item.createdAt)}</div>
              </div>
            </div>

            {item.kind === "bridge" ? (
              <div className="mt-3 grid gap-3">
                <div className="mono rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-100">{item.content}</div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300/75">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 grid gap-2 text-sm text-slate-200/80 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">Size: {formatBytes(item.sizeBytes)}</div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">Expires in {timeUntil(item.expiresAt)}</div>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}