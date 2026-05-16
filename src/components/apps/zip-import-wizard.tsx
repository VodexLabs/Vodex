"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, CheckCircle2, AlertCircle, Loader2,
  FileCode2, Package, Layers, Database, Zap,
  Smartphone, Globe, GitBranch, ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Detection types ──────────────────────────────────────────────────────────

interface DetectedItem {
  id: string;
  label: string;
  value: string;
  status: "detected" | "warning" | "missing";
  icon: React.ElementType;
}

interface ScanResult {
  framework: string;
  packageManager: string;
  detected: DetectedItem[];
  warnings: string[];
  estimatedRestore: string;
}

// ─── Simulated scan pipeline ─────────────────────────────────────────────────
// In production, this would POST to /api/projects/import-zip and stream results.
// Here we simulate the detection pipeline with realistic timing for the UX.

async function simulateScan(fileName: string): Promise<ScanResult> {
  // Simulate extraction + scanning delay
  await new Promise((r) => setTimeout(r, 2800));

  const isNextJs = fileName.toLowerCase().includes("next") || Math.random() > 0.3;
  const hasSupabase = Math.random() > 0.4;
  const hasStripe = Math.random() > 0.6;
  const hasCapacitor = Math.random() > 0.7;

  return {
    framework: isNextJs ? "Next.js 16" : "React + Vite",
    packageManager: "npm",
    estimatedRestore: "2–4 minutes",
    warnings: [
      "node_modules not included (will be reinstalled)",
      ".env values not detected — add secrets manually",
    ],
    detected: [
      {
        id: "framework",
        label: "Framework",
        value: isNextJs ? "Next.js 16 (App Router)" : "React + Vite",
        status: "detected",
        icon: FileCode2,
      },
      {
        id: "pkg",
        label: "package.json",
        value: "Found — 24 dependencies",
        status: "detected",
        icon: Package,
      },
      {
        id: "tailwind",
        label: "Tailwind CSS",
        value: "tailwind.config.ts detected",
        status: "detected",
        icon: Layers,
      },
      {
        id: "supabase",
        label: "Supabase",
        value: hasSupabase ? "@supabase/ssr detected" : "Not detected",
        status: hasSupabase ? "detected" : "missing",
        icon: Database,
      },
      {
        id: "stripe",
        label: "Stripe",
        value: hasStripe ? "stripe + webhook handler detected" : "Not detected",
        status: hasStripe ? "detected" : "missing",
        icon: Zap,
      },
      {
        id: "capacitor",
        label: "Capacitor / TWA",
        value: hasCapacitor ? "capacitor.config.ts detected" : "Not detected",
        status: hasCapacitor ? "detected" : "missing",
        icon: Smartphone,
      },
      {
        id: "routes",
        label: "Routes",
        value: isNextJs ? "App Router — 14 routes found" : "React Router — 8 routes found",
        status: "detected",
        icon: Globe,
      },
      {
        id: "envexample",
        label: "Environment template",
        value: ".env.local.example detected",
        status: "detected",
        icon: FileCode2,
      },
      {
        id: "git",
        label: "Git history",
        value: ".git not included — fresh history will be created",
        status: "warning",
        icon: GitBranch,
      },
    ].filter(Boolean) as DetectedItem[],
  };
}

// ─── Pipeline step ────────────────────────────────────────────────────────────

interface PipelineStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
}

const PIPELINE: PipelineStep[] = [
  { id: "upload", label: "Uploading archive", status: "pending" },
  { id: "extract", label: "Extracting contents", status: "pending" },
  { id: "detect-framework", label: "Detecting framework", status: "pending" },
  { id: "detect-integrations", label: "Scanning integrations", status: "pending" },
  { id: "detect-routes", label: "Mapping routes & config", status: "pending" },
  { id: "restore", label: "Reconstructing project model", status: "pending" },
];

function StepIcon({ status }: { status: PipelineStep["status"] }) {
  if (status === "running") return <Loader2 className="size-4 animate-spin text-accent" />;
  if (status === "done") return <CheckCircle2 className="size-4 text-positive" strokeWidth={1.75} />;
  if (status === "error") return <AlertCircle className="size-4 text-destructive" strokeWidth={1.75} />;
  return <div className="size-4 rounded-full bg-border" />;
}

const STATUS_COLORS: Record<DetectedItem["status"], string> = {
  detected: "text-positive",
  warning: "text-amber-500",
  missing: "text-muted-foreground/50",
};

const STATUS_ICONS: Record<DetectedItem["status"], React.ElementType> = {
  detected: CheckCircle2,
  warning: AlertCircle,
  missing: X,
};

// ─── Main wizard ──────────────────────────────────────────────────────────────

type WizardStep = "idle" | "scanning" | "results" | "done";

interface ZipImportWizardProps {
  onClose: () => void;
  onComplete: (projectName: string) => void;
}

export function ZipImportWizard({ onClose, onComplete }: ZipImportWizardProps) {
  const [step, setStep] = React.useState<WizardStep>("idle");
  const [dragOver, setDragOver] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [pipeline, setPipeline] = React.useState<PipelineStep[]>(PIPELINE);
  const [scanResult, setScanResult] = React.useState<ScanResult | null>(null);
  const [projectName, setProjectName] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.name.endsWith(".zip")) {
      return;
    }
    setFile(f);
    setProjectName(f.name.replace(".zip", ""));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function startScan() {
    if (!file) return;
    setStep("scanning");

    // Animate each pipeline step sequentially
    const steps = [...PIPELINE];
    for (let i = 0; i < steps.length; i++) {
      steps[i] = { ...steps[i], status: "running" };
      setPipeline([...steps]);
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));
      steps[i] = { ...steps[i], status: "done" };
      setPipeline([...steps]);
    }

    const result = await simulateScan(file.name);
    setScanResult(result);
    setStep("results");
  }

  function handleOpen() {
    setStep("done");
    setTimeout(() => onComplete(projectName || file?.name.replace(".zip", "") || "Imported Project"), 600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-2xl overflow-hidden rounded-[var(--radius-xl)] bg-background shadow-2xl ring-1 ring-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[15px] font-semibold text-foreground">Import ZIP</p>
            <p className="text-[12px] text-muted-foreground">Restore an existing project into DreamOS86</p>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground transition"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {step === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] border-2 border-dashed py-14 transition",
                    dragOver
                      ? "border-accent bg-accent/5"
                      : file
                        ? "border-positive/40 bg-positive/5"
                        : "border-border hover:border-accent/40 hover:bg-surface/50",
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  <div className={cn("flex size-14 items-center justify-center rounded-full", file ? "bg-positive/10" : "bg-accent/10")}>
                    {file
                      ? <CheckCircle2 className="size-7 text-positive" strokeWidth={1.5} />
                      : <Upload className="size-7 text-accent" strokeWidth={1.5} />
                    }
                  </div>
                  {file ? (
                    <div className="text-center">
                      <p className="text-[14px] font-semibold text-foreground">{file.name}</p>
                      <p className="text-[12px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB · ready to scan</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-[14px] font-medium text-foreground">Drop your ZIP here</p>
                      <p className="text-[12px] text-muted-foreground">or click to browse · max 100MB</p>
                    </div>
                  )}
                </div>

                {file && (
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-foreground">Project name</label>
                    <input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="h-9 w-full rounded-[var(--radius-md)] bg-surface px-3 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-accent/40"
                      placeholder="My imported app"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                  <Button variant="accent" size="sm" disabled={!file} onClick={startScan}>
                    Scan & import
                    <ChevronRight className="size-3.5" strokeWidth={2} />
                  </Button>
                </div>

                <p className="text-center text-[11px] text-muted-foreground">
                  Exclude <code className="font-mono">node_modules</code> and <code className="font-mono">.next</code> from your ZIP for best results.
                </p>
              </motion.div>
            )}

            {/* Step 2: Scanning */}
            {step === "scanning" && (
              <motion.div
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 rounded-lg bg-accent/8 px-4 py-3">
                  <Loader2 className="size-4 animate-spin text-accent" />
                  <p className="text-[13px] font-medium text-foreground">
                    Scanning <span className="text-accent">{file?.name}</span>…
                  </p>
                </div>

                <div className="space-y-2 rounded-[var(--radius-xl)] bg-surface p-4 ring-1 ring-border">
                  {pipeline.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 py-1">
                      <StepIcon status={s.status} />
                      <p className={cn(
                        "text-[12.5px] transition",
                        s.status === "done" ? "text-foreground" : s.status === "running" ? "text-foreground font-medium" : "text-muted-foreground/50",
                      )}>
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Results */}
            {step === "results" && scanResult && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 scrollbar-none"
              >
                {/* Summary */}
                <div className="flex items-center gap-3 rounded-lg bg-positive/8 px-4 py-3 ring-1 ring-positive/20">
                  <CheckCircle2 className="size-4 text-positive" strokeWidth={1.75} />
                  <div>
                    <p className="text-[13px] font-medium text-foreground">
                      Scan complete — {scanResult.framework} project detected
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Estimated restore: {scanResult.estimatedRestore}
                    </p>
                  </div>
                </div>

                {/* Detected technologies */}
                <div className="rounded-[var(--radius-xl)] bg-surface ring-1 ring-border overflow-hidden">
                  <div className="border-b border-border px-4 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Detected</p>
                  </div>
                  <div className="divide-y divide-border/60 px-1">
                    {scanResult.detected.map((item) => {
                      const StatusIcon = STATUS_ICONS[item.status];
                      const ItemIcon = item.icon;
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                          <ItemIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium text-foreground">{item.label}</p>
                            <p className={cn("text-[11px]", STATUS_COLORS[item.status])}>{item.value}</p>
                          </div>
                          <StatusIcon className={cn("size-3.5 shrink-0", STATUS_COLORS[item.status])} strokeWidth={1.75} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Warnings */}
                {scanResult.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {scanResult.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-500/8 px-3 py-2 text-[12px] text-amber-600 ring-1 ring-amber-500/15 dark:text-amber-400">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setStep("idle")}>
                    Start over
                  </Button>
                  <Button variant="accent" size="sm" onClick={handleOpen} className="gap-1.5">
                    Open in workspace
                    <ExternalLink className="size-3.5" strokeWidth={2} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Done */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-10 text-center"
              >
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-positive/10 ring-1 ring-positive/20">
                  <CheckCircle2 className="size-8 text-positive" strokeWidth={1.75} />
                </div>
                <p className="text-[16px] font-semibold text-foreground">Project restored</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Opening <strong>{projectName}</strong> in your workspace…
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
