"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Archive, ImageIcon, FileText, GitBranch, FolderOpen, ArrowRight, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZipImportWizard } from "@/components/apps/zip-import-wizard";

// ─── Import action types ──────────────────────────────────────────────────────

interface ImportAction {
  id: string;
  icon: React.ElementType;
  label: string;
  sublabel: string;
  action: "zip" | "image" | "file" | "github";
  accept?: string;
}

const IMPORT_ACTIONS: ImportAction[] = [
  {
    id: "zip",
    icon: Archive,
    label: "Import ZIP",
    sublabel: "Existing codebase",
    action: "zip",
    accept: ".zip",
  },
  {
    id: "image",
    icon: ImageIcon,
    label: "Upload images",
    sublabel: "Screenshots, mockups",
    action: "image",
    accept: "image/*",
  },
  {
    id: "file",
    icon: FileText,
    label: "Upload files",
    sublabel: "PDFs, JSON, text",
    action: "file",
    accept: ".pdf,.json,.txt,.md,.csv",
  },
  {
    id: "github",
    icon: GitBranch,
    label: "Connect GitHub",
    sublabel: "Import repository",
    action: "github",
  },
];

interface ImportBarProps {
  onFilesAttached?: (files: File[]) => void;
}

export function ImportBar({ onFilesAttached }: ImportBarProps) {
  const [showZip, setShowZip] = React.useState(false);
  const [attached, setAttached] = React.useState<File[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [accept, setAccept] = React.useState<string>("");

  function handleAction(action: ImportAction) {
    if (action.action === "zip") {
      setShowZip(true);
    } else if (action.action === "github") {
      window.location.href = "/auth/login?provider=github&next=/settings/integrations";
    } else {
      setAccept(action.accept ?? "*");
      setTimeout(() => fileRef.current?.click(), 0);
    }
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const next = [...attached, ...files];
    setAttached(next);
    onFilesAttached?.(next);
    e.target.value = "";
  }

  function removeAttachment(i: number) {
    const next = attached.filter((_, j) => j !== i);
    setAttached(next);
    onFilesAttached?.(next);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="w-full"
      >
        {/* Import actions row */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Import
          </span>
          {IMPORT_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleAction(action)}
                className={cn(
                  "group flex cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-surface/80 px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground",
                  "shadow-[var(--shadow-xs)] backdrop-blur-sm",
                  "transition-all duration-150",
                  "hover:border-accent/40 hover:bg-surface hover:text-foreground hover:shadow-[var(--shadow-sm)]",
                  "active:scale-[0.97]",
                )}
              >
                <Icon className="size-3.5 shrink-0 transition group-hover:text-accent" strokeWidth={1.75} />
                <span>{action.label}</span>
              </button>
            );
          })}

          <a
            href="/projects"
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full border border-border/70 bg-surface/80 px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground",
              "shadow-[var(--shadow-xs)] backdrop-blur-sm transition-all duration-150",
              "hover:border-accent/40 hover:bg-surface hover:text-foreground hover:shadow-[var(--shadow-sm)]",
              "active:scale-[0.97]",
            )}
          >
            <FolderOpen className="size-3.5 shrink-0" strokeWidth={1.75} />
            All projects
            <ArrowRight className="size-3 shrink-0 opacity-50" strokeWidth={2} />
          </a>
        </div>

        {/* Attached file chips */}
        {attached.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 flex flex-wrap justify-center gap-2 overflow-hidden"
          >
            {attached.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full border border-positive/25 bg-positive/8 px-3 py-1 text-[11px] font-medium text-positive"
              >
                <CheckCircle2 className="size-3 shrink-0" strokeWidth={2.5} />
                <span className="max-w-[120px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="ml-0.5 cursor-pointer rounded-full opacity-60 hover:opacity-100 transition"
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleFiles}
      />

      {/* ZIP wizard */}
      {showZip && (
        <ZipImportWizard
          onClose={() => setShowZip(false)}
          onComplete={() => setShowZip(false)}
        />
      )}
    </>
  );
}
