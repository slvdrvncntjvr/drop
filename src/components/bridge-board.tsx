"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

type BridgeItem = {
  id: string;
  type: "text" | "code" | "link" | "image";
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  sourceDevice: string;
  createdAt: string;
  updatedAt: string;
  noteId: string | null;
};

const itemTypes = ["text", "code", "link", "image"] as const;

export function BridgeBoard({ initialItems }: { initialItems: BridgeItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<(typeof itemTypes)[number] | "all">("all");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "text" as BridgeItem["type"],
    title: "",
    content: "",
    tags: "",
    sourceDevice: "PC",
    isPinned: false,
    isFavorite: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  async function refresh() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedType !== "all") params.set("type", selectedType);
    const response = await fetch(`/api/bridge?${params.toString()}`);
    if (response.ok) {
      const payload = (await response.json()) as BridgeItem[];
      setItems(payload);
    }
  }

  useEffect(() => {
    refresh().catch(() => undefined);
    const interval = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [query, selectedType]);

  const filteredCount = useMemo(() => items.length, [items]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("type", form.type);
      formData.set("title", form.title);
      formData.set("content", form.content);
      formData.set("tags", form.tags);
      formData.set("sourceDevice", form.sourceDevice);
      formData.set("isPinned", String(form.isPinned));
      formData.set("isFavorite", String(form.isFavorite));
      if (imageFile) {
        formData.set("file", imageFile);
      }

      const response = await fetch("/api/bridge", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Failed to create item.");
        return;
      }

      setItems((current) => [payload.item, ...current]);
      setForm({
        type: "text",
        title: "",
        content: "",
        tags: "",
        sourceDevice: form.sourceDevice,
        isPinned: false,
        isFavorite: false,
      });
      setImageFile(null);
      setMessage("Bridge item saved.");
      router.refresh();
    });
  }

  async function updateItem(id: string, action: "pin" | "favorite" | "delete" | "save-note") {
    let response: Response;

    if (action === "pin") {
      response = await fetch(`/api/bridge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: true }),
      });
    } else if (action === "favorite") {
      response = await fetch(`/api/bridge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: true }),
      });
    } else if (action === "save-note") {
      response = await fetch(`/api/bridge/${id}/save-note`, { method: "POST" });
    } else {
      response = await fetch(`/api/bridge/${id}`, { method: "DELETE" });
    }

    if (!response.ok) {
      setMessage("Could not update the item.");
      return;
    }

    if (action === "delete") {
      setItems((current) => current.filter((item) => item.id !== id));
    } else {
      await refresh();
    }

    setMessage(action === "save-note" ? "Saved to notes." : "Item updated.");
  }

  async function copyContent(content: string) {
    await navigator.clipboard.writeText(content);
    setMessage("Copied to clipboard.");
  }

  async function openContent(item: BridgeItem) {
    if (item.type === "link" || item.type === "image") {
      window.open(item.content, "_blank", "noopener,noreferrer");
      return;
    }

    await copyContent(item.content);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <section className="panel rounded-[2rem] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">New item</h2>
            <p className="text-sm text-slate-300/70">{filteredCount} item(s) visible. Polling every 5 seconds.</p>
          </div>
          <button id="new-item-trigger" type="button" className="button-secondary px-3 py-2 text-sm" onClick={() => document.getElementById("bridge-form")?.scrollIntoView({ behavior: "smooth" })}>
            Focus form
          </button>
        </div>

        <form id="bridge-form" className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2 text-sm text-slate-200/80">
            Type
            <select className="field" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as BridgeItem["type"] }))}>
              {itemTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <label className="grid gap-2 text-sm text-slate-200/80">
            Title
            <input className="field" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </label>
          <label className="grid gap-2 text-sm text-slate-200/80">
            Content
            <textarea className="field min-h-36 resize-y" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} required />
          </label>
          <label className="grid gap-2 text-sm text-slate-200/80">
            Image file
            <input className="field" type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm text-slate-200/80">
              Tags, comma-separated
              <input className="field" value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm text-slate-200/80">
              Device
              <input className="field" value={form.sourceDevice} onChange={(event) => setForm((current) => ({ ...current, sourceDevice: event.target.value }))} />
            </label>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-200/80">
            <label className="flex items-center gap-2">
              <input checked={form.isPinned} type="checkbox" onChange={(event) => setForm((current) => ({ ...current, isPinned: event.target.checked }))} />
              Pinned
            </label>
            <label className="flex items-center gap-2">
              <input checked={form.isFavorite} type="checkbox" onChange={(event) => setForm((current) => ({ ...current, isFavorite: event.target.checked }))} />
              Favorite
            </label>
          </div>
          <button className="button-primary px-4 py-3 text-sm disabled:opacity-60" disabled={pending} type="submit">
            {pending ? "Saving..." : "Create item"}
          </button>
        </form>

        {message ? <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100">{message}</p> : null}
      </section>

      <section className="panel rounded-[2rem] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-2">
            <h2 className="text-xl font-semibold text-white">Clipboard bridge</h2>
            <p className="text-sm text-slate-300/70">Fast add, copy, open, and save as note.</p>
          </div>
          <div className="grid gap-3 md:min-w-[360px]">
            <input id="global-search" className="field" placeholder="Search clipboard items..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              {(["all", ...itemTypes] as const).map((type) => (
                <button
                  key={type}
                  className={type === selectedType ? "chip-active rounded-full px-3 py-2 text-sm" : "chip rounded-full px-3 py-2 text-sm"}
                  type="button"
                  onClick={() => setSelectedType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {items.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/3 p-8 text-center text-sm text-slate-300/70">
              Nothing here yet. Add your first note, link, or image from any device.
            </div>
          ) : null}

          {items.map((item) => (
            <article key={item.id} className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4 transition hover:border-sky-400/30 hover:bg-white/6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-sky-200/70">
                    <span>{item.type}</span>
                    {item.isPinned ? <span>pinned</span> : null}
                    {item.isFavorite ? <span>favorite</span> : null}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>{item.sourceDevice}</div>
                  <div>{formatDateTime(item.createdAt)}</div>
                </div>
              </div>
              <pre className="mono mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-slate-100">{item.content}</pre>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300/75">
                {item.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => copyContent(item.content)}>
                  Copy
                </button>
                <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => openContent(item)}>
                  Open
                </button>
                <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => updateItem(item.id, "save-note")}>Save as note</button>
                <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => updateItem(item.id, "pin")}>Pin</button>
                <button className="button-secondary px-3 py-2 text-sm" type="button" onClick={() => updateItem(item.id, "favorite")}>Favorite</button>
                <button className="button-danger px-3 py-2 text-sm" type="button" onClick={() => updateItem(item.id, "delete")}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}