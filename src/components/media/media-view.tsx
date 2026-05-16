"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, ImageIcon, FolderOpen, Grid, List,
  Search, Download, Copy, Trash2, Loader2,
  FileText, Video, CheckCircle2, AlertCircle, Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaAsset {
  id: string;
  filename: string;
  asset_type: "image" | "video" | "document";
  mime_type: string;
  size_bytes: number;
  public_url: string;
  created_at: string;
}

const ASSET_TYPES = ["All", "Images", "Videos", "Documents"];

function assetCategory(asset: MediaAsset): string {
  if (asset.asset_type === "image") return "Images";
  if (asset.asset_type === "video") return "Videos";
  return "Documents";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString();
}

function AssetIcon({ asset, className }: { asset: MediaAsset; className?: string }) {
  if (asset.asset_type === "image") {
    if (asset.public_url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.public_url}
          alt={asset.filename}
          className={cn("h-full w-full object-cover", className)}
        />
      );
    }
    return <ImageIcon className={cn("size-7 text-foreground/30", className)} strokeWidth={1.25} />;
  }
  if (asset.asset_type === "video") {
    return <Film className={cn("size-7 text-foreground/30", className)} strokeWidth={1.25} />;
  }
  return <FileText className={cn("size-7 text-foreground/30", className)} strokeWidth={1.25} />;
}

// ─── Upload zone ─────────────────────────────────────────────────────────────

interface UploadState {
  name: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MediaView() {
  const [activeType, setActiveType] = React.useState("All");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [dragOver, setDragOver] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const [assets, setAssets] = React.useState<MediaAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const [uploads, setUploads] = React.useState<UploadState[]>([]);

  const [copied, setCopied] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ── Fetch assets ────────────────────────────────────────────────────────────

  async function fetchAssets() {
    setLoadingAssets(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/media");
      if (!res.ok) throw new Error(await res.text());
      const { assets: data } = await res.json();
      setAssets(data ?? []);
    } catch (err) {
      setFetchError((err as Error).message ?? "Failed to load assets");
    } finally {
      setLoadingAssets(false);
    }
  }

  React.useEffect(() => { fetchAssets(); }, []);

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function uploadFile(file: File) {
    const key = `${Date.now()}-${file.name}`;
    setUploads((prev) => [...prev, { name: file.name, progress: 0, status: "uploading" }]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 90);
            setUploads((prev) =>
              prev.map((u) => (u.name === file.name ? { ...u, progress: pct } : u)),
            );
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploads((prev) =>
              prev.map((u) => (u.name === file.name ? { ...u, progress: 100, status: "done" } : u)),
            );
            resolve();
          } else {
            reject(new Error(xhr.responseText || "Upload failed"));
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.open("POST", "/api/media");
        xhr.send(formData);
      });

      // Refresh list
      const res = await fetch("/api/media");
      const { assets: data } = await res.json();
      setAssets(data ?? []);
    } catch (err) {
      setUploads((prev) =>
        prev.map((u) =>
          u.name === file.name
            ? { ...u, status: "error", error: (err as Error).message }
            : u,
        ),
      );
    } finally {
      // Remove upload status after 3s
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.name !== file.name));
      }, 3000);
    }
    void key;
  }

  function handleFiles(files: FileList | File[]) {
    Array.from(files).forEach(uploadFile);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function deleteAsset(id: string) {
    setDeleting(id);
    try {
      await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filtered = assets.filter((a) => {
    if (activeType !== "All" && assetCategory(a) !== activeType) return false;
    if (searchQuery && !a.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalBytes = assets.reduce((acc, a) => acc + (a.size_bytes ?? 0), 0);
  const storageGB = totalBytes / (1024 ** 3);
  const storagePct = Math.min((storageGB / 25) * 100, 100);

  return (
    <div className="relative mx-auto max-w-5xl space-y-6">
      <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_68%)] blur-3xl" />

      {/* Header */}
      <motion.div variants={variants.fadeUp} initial="hidden" animate="show" className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">MEDIA</p>
          <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.4rem)] font-semibold tracking-[-0.055em] text-foreground">
            Media & Assets
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {loadingAssets ? "Loading…" : `${assets.length} asset${assets.length !== 1 ? "s" : ""} · ${formatBytes(totalBytes)} used`}
          </p>
        </div>
        <Button variant="accent" size="md" onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" strokeWidth={1.75} />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </motion.div>

      {/* Upload drop zone */}
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.05 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-[var(--radius-xl)] border-2 border-dashed p-8 text-center transition cursor-pointer",
          dragOver ? "border-accent bg-accent-muted" : "border-border bg-surface/50 hover:border-accent/50 hover:bg-accent-muted/30",
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon className={cn("size-8 mb-3", dragOver ? "text-accent" : "text-muted-foreground/40")} strokeWidth={1.25} />
        <p className="text-[14px] font-medium text-foreground">Drop files here or click to upload</p>
        <p className="mt-1 text-[12px] text-muted-foreground">PNG, JPG, SVG, WebP, PDF up to 50 MB each</p>
        <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <FolderOpen className="size-3.5" strokeWidth={1.75} />
            Browse files
          </Button>
        </div>
      </motion.div>

      {/* Active upload progress */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            {uploads.map((u) => (
              <div key={u.name} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 ring-1 ring-border">
                {u.status === "uploading" && <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" strokeWidth={1.75} />}
                {u.status === "done"      && <CheckCircle2 className="size-3.5 shrink-0 text-positive" strokeWidth={2} />}
                {u.status === "error"     && <AlertCircle className="size-3.5 shrink-0 text-destructive" strokeWidth={2} />}
                <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{u.name}</span>
                {u.status === "uploading" && (
                  <div className="w-24 overflow-hidden rounded-full bg-muted/50 h-1">
                    <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${u.progress}%` }} />
                  </div>
                )}
                {u.status === "error" && (
                  <span className="text-[11px] text-destructive truncate max-w-[140px]">{u.error}</span>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <motion.div variants={variants.fadeUp} initial="hidden" animate="show" transition={{ delay: 0.08 }} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {ASSET_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveType(t)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium transition",
                activeType === t ? "bg-foreground text-background" : "bg-surface text-muted-foreground ring-1 ring-border hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.55} />
            <input
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-36 rounded-[var(--radius-md)] bg-surface pl-8 pr-3 text-[12px] text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex gap-0.5 rounded-[var(--radius-md)] bg-surface p-0.5 ring-1 ring-border">
            {([["grid", Grid], ["list", List]] as const).map(([v, Icon]) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "flex size-7 cursor-pointer items-center justify-center rounded-[calc(var(--radius-md)-2px)] transition",
                  view === v ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.65} />
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Error */}
      {fetchError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-[13px] text-destructive ring-1 ring-destructive/20">
          <AlertCircle className="size-4 shrink-0" strokeWidth={2} />
          {fetchError}
          <button className="ml-auto cursor-pointer text-[11px] underline" onClick={fetchAssets}>Retry</button>
        </div>
      )}

      {/* Asset list / grid */}
      {loadingAssets ? (
        <div className={cn(view === "grid" ? "grid gap-4 sm:grid-cols-3 lg:grid-cols-4" : "space-y-1")}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={cn(view === "grid" ? "animate-pulse rounded-[var(--radius-lg)] bg-surface ring-1 ring-border h-40" : "animate-pulse h-10 rounded-lg bg-surface")} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-border py-16 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-surface ring-1 ring-border">
            <ImageIcon className="size-5 text-muted-foreground/40" strokeWidth={1.25} />
          </div>
          <div>
            <p className="text-[14px] font-medium text-foreground">
              {searchQuery ? "No assets match your search" : activeType !== "All" ? `No ${activeType.toLowerCase()} yet` : "No assets yet"}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Upload images, videos, or documents to see them here.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-3.5" strokeWidth={1.75} />
            Upload first asset
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={view === "grid" ? variants.staggerContainer : undefined}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className={cn(view === "grid" ? "grid gap-4 sm:grid-cols-3 lg:grid-cols-4" : "space-y-1")}
        >
          {filtered.map((asset) =>
            view === "grid" ? (
              <motion.div
                key={asset.id}
                variants={variants.staggerItem}
                className="group overflow-hidden rounded-[var(--radius-lg)] bg-surface ring-1 ring-border transition hover:shadow-[var(--shadow-sm)]"
              >
                <div className="relative flex h-28 items-center justify-center overflow-hidden bg-muted/30">
                  {asset.asset_type === "image" && asset.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.public_url} alt={asset.filename} className="h-full w-full object-cover" />
                  ) : (
                    <AssetIcon asset={asset} />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-foreground/0 opacity-0 transition group-hover:bg-foreground/10 group-hover:opacity-100">
                    <a
                      href={asset.public_url}
                      download={asset.filename}
                      target="_blank"
                      rel="noreferrer"
                      className="flex size-7 items-center justify-center rounded-[var(--radius-md)] bg-background/90 shadow-sm hover:bg-background"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                    </a>
                    <button
                      className="flex size-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-background/90 shadow-sm hover:bg-background"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(asset.public_url).catch(() => {});
                        setCopied(asset.id);
                        setTimeout(() => setCopied(null), 2000);
                      }}
                    >
                      {copied === asset.id
                        ? <CheckCircle2 className="size-3.5 text-positive" strokeWidth={2} />
                        : <Copy className="size-3.5 text-muted-foreground" strokeWidth={1.75} />}
                    </button>
                    <button
                      className="flex size-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] bg-background/90 shadow-sm hover:bg-background disabled:opacity-50"
                      disabled={deleting === asset.id}
                      onClick={(e) => { e.stopPropagation(); deleteAsset(asset.id); }}
                    >
                      {deleting === asset.id
                        ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" strokeWidth={1.75} />
                        : <Trash2 className="size-3.5 text-destructive/70 hover:text-destructive" strokeWidth={1.75} />}
                    </button>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-[11px] font-medium text-foreground">{asset.filename}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(asset.size_bytes)} · {formatDate(asset.created_at)}
                  </p>
                </div>
              </motion.div>
            ) : (
              <div
                key={asset.id}
                className="group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition hover:bg-surface"
              >
                <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-muted/30">
                  {asset.asset_type === "image" && asset.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.public_url} alt={asset.filename} className="h-full w-full object-cover" />
                  ) : (
                    <AssetIcon asset={asset} className="size-4" />
                  )}
                </div>
                <p className="flex-1 truncate text-[13px] font-medium text-foreground">{asset.filename}</p>
                <span className="text-[12px] text-muted-foreground">{formatBytes(asset.size_bytes)}</span>
                <span className="text-[12px] text-muted-foreground">{formatDate(asset.created_at)}</span>
                <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  <a
                    href={asset.public_url}
                    download={asset.filename}
                    target="_blank"
                    rel="noreferrer"
                    className="flex size-6 cursor-pointer items-center justify-center rounded hover:bg-muted"
                  >
                    <Download className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                  </a>
                  <button
                    className="flex size-6 cursor-pointer items-center justify-center rounded hover:bg-muted"
                    onClick={() => {
                      navigator.clipboard.writeText(asset.public_url).catch(() => {});
                      setCopied(asset.id);
                      setTimeout(() => setCopied(null), 2000);
                    }}
                  >
                    {copied === asset.id
                      ? <CheckCircle2 className="size-3.5 text-positive" strokeWidth={2} />
                      : <Copy className="size-3.5 text-muted-foreground" strokeWidth={1.75} />}
                  </button>
                  <button
                    className="flex size-6 cursor-pointer items-center justify-center rounded hover:bg-muted disabled:opacity-50"
                    disabled={deleting === asset.id}
                    onClick={() => deleteAsset(asset.id)}
                  >
                    {deleting === asset.id
                      ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" strokeWidth={1.75} />
                      : <Trash2 className="size-3.5 text-destructive/70" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>
            ),
          )}
        </motion.div>
      )}

      {/* Storage bar */}
      {!loadingAssets && (
        <motion.div
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.2 }}
          className="rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-xs)] ring-1 ring-border"
        >
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Storage used</span>
            <span className="font-medium text-foreground">{formatBytes(totalBytes)} of 25 GB</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/50">
            <div
              className={cn("h-full rounded-full bg-accent transition-all", storagePct > 80 && "bg-destructive")}
              style={{ width: `${storagePct}%` }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
