"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Shield, Smartphone, Apple, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { MobileAppConfig } from "@/lib/mobile/types";
import {
  validateAndroidPackageId,
  validateIosBundleId,
  validateVersionName,
} from "@/lib/mobile/package-validation";
import {
  isValidShaFingerprint,
  normalizeFingerprint,
  readShaRegistry,
  shaRegistryToStoreDraft,
} from "@/lib/mobile/sha-key-registry";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSaved?: () => void;
};

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-foreground">{label}</span>
      {hint ? <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1 text-[10px] text-destructive">{error}</p> : null}
    </label>
  );
}

export function MobileSigningConfigDrawer({ open, onClose, projectId, onSaved }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [config, setConfig] = React.useState<Partial<MobileAppConfig>>({});
  const [sha256, setSha256] = React.useState<string[]>([""]);
  const [sha1, setSha1] = React.useState<string[]>([""]);

  React.useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/mobile/config`, { credentials: "include" });
        const json = (await res.json()) as { config?: Partial<MobileAppConfig> };
        if (cancelled) return;
        const cfg = json.config ?? {};
        setConfig(cfg);
        const draft =
          cfg.store_draft && typeof cfg.store_draft === "object"
            ? (cfg.store_draft as Record<string, unknown>)
            : {};
        const reg = readShaRegistry(draft);
        setSha256(reg.sha256.length ? reg.sha256.map((e) => e.fingerprint) : [""]);
        setSha1(reg.sha1.length ? reg.sha1.map((e) => e.fingerprint) : [""]);
      } catch {
        if (!cancelled) toast.error("Could not load mobile config");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const pkgCheck = validateAndroidPackageId(config.package_id);
  const bundleCheck = validateIosBundleId(config.bundle_id);
  const versionOk = validateVersionName(config.version_name ?? "");
  const versionCodeOk = (config.android_version_code ?? 0) >= 1;
  const buildOk = (config.ios_build_number ?? 0) >= 1;

  function updateSha(
    algo: "sha256" | "sha1",
    index: number,
    value: string,
  ) {
    const setter = algo === "sha256" ? setSha256 : setSha1;
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addShaSlot(algo: "sha256" | "sha1") {
    const list = algo === "sha256" ? sha256 : sha1;
    if (list.length >= 3) return;
    const last = list[list.length - 1]?.trim() ?? "";
    if (!last || !isValidShaFingerprint(last, algo)) {
      toast.error(`Enter a valid ${algo.toUpperCase()} fingerprint first`);
      return;
    }
    const setter = algo === "sha256" ? setSha256 : setSha1;
    setter((prev) => [...prev, ""]);
  }

  async function save() {
    const valid256 = sha256.map((s) => normalizeFingerprint(s)).filter((s) => isValidShaFingerprint(s, "sha256"));
    const valid1 = sha1.map((s) => normalizeFingerprint(s)).filter((s) => isValidShaFingerprint(s, "sha1"));
    const invalid256 = sha256.filter((s) => s.trim() && !isValidShaFingerprint(s, "sha256"));
    const invalid1 = sha1.filter((s) => s.trim() && !isValidShaFingerprint(s, "sha1"));
    if (invalid256.length || invalid1.length) {
      toast.error("Fix invalid SHA fingerprints before saving");
      return;
    }
    if (!pkgCheck.valid) {
      toast.error(pkgCheck.message ?? "Invalid Android package ID");
      return;
    }

    setSaving(true);
    try {
      const storeDraft = {
        ...(config.store_draft && typeof config.store_draft === "object" ? config.store_draft : {}),
        ...shaRegistryToStoreDraft({
          sha256: valid256.map((f) => ({
            fingerprint: f,
            label: "upload_key",
            algorithm: "sha256",
            addedAt: new Date().toISOString(),
          })),
          sha1: valid1.map((f) => ({
            fingerprint: f,
            label: "upload_key",
            algorithm: "sha1",
            addedAt: new Date().toISOString(),
          })),
        }),
      };
      const res = await fetch(`/api/projects/${projectId}/mobile/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          package_id: config.package_id?.trim() || null,
          bundle_id: config.bundle_id?.trim() || null,
          version_name: config.version_name ?? "0.0.1",
          android_version_code: config.android_version_code ?? 1,
          ios_build_number: config.ios_build_number ?? 1,
          store_draft: storeDraft,
          meta: {
            ...(config.meta && typeof config.meta === "object" ? config.meta : {}),
            android_signing_configured: valid256.length > 0,
            ios_signing_configured: bundleCheck.valid && buildOk,
          },
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      toast.success("Mobile signing & identifiers saved");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[10055] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="relative flex max-h-[min(92dvh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl ring-1 ring-border sm:rounded-2xl"
            data-testid="mobile-signing-config-drawer"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-accent" />
                <p className="text-[15px] font-semibold">Mobile signing & identifiers</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-foreground">
                      <Smartphone className="size-4 text-accent" /> Android
                    </div>
                    <div className="space-y-3">
                      <Field
                        label="Package ID"
                        hint="e.g. com.company.appname — lowercase, dot-separated"
                        error={config.package_id && !pkgCheck.valid ? pkgCheck.message : undefined}
                      >
                        <input
                          value={config.package_id ?? ""}
                          onChange={(e) => setConfig((c) => ({ ...c, package_id: e.target.value }))}
                          className="w-full rounded-xl bg-surface px-3 py-2.5 text-[13px] ring-1 ring-border"
                          placeholder="com.example.myapp"
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Version name" hint="e.g. 0.0.1" error={!versionOk ? "Invalid version" : undefined}>
                          <input
                            value={config.version_name ?? ""}
                            onChange={(e) => setConfig((c) => ({ ...c, version_name: e.target.value }))}
                            className="w-full rounded-xl bg-surface px-3 py-2.5 text-[13px] ring-1 ring-border"
                          />
                        </Field>
                        <Field label="Version code" hint="Positive integer" error={!versionCodeOk ? "Must be ≥ 1" : undefined}>
                          <input
                            type="number"
                            min={1}
                            value={config.android_version_code ?? 1}
                            onChange={(e) =>
                              setConfig((c) => ({ ...c, android_version_code: Number(e.target.value) || 1 }))
                            }
                            className="w-full rounded-xl bg-surface px-3 py-2.5 text-[13px] ring-1 ring-border"
                          />
                        </Field>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold">SHA-256 fingerprints</p>
                        <p className="text-[10px] text-muted-foreground">Up to 3 — required for Play App Signing</p>
                        <ul className="mt-2 space-y-2">
                          {sha256.map((val, i) => (
                            <li key={i} className="flex gap-2">
                              <input
                                value={val}
                                onChange={(e) => updateSha("sha256", i, e.target.value)}
                                className={cn(
                                  "min-w-0 flex-1 rounded-xl bg-surface px-3 py-2 text-[11px] font-mono ring-1 ring-border",
                                  val.trim() && !isValidShaFingerprint(val, "sha256") && "ring-destructive/50",
                                )}
                                placeholder="AA:BB:… or 64 hex chars"
                              />
                              {i > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setSha256((prev) => prev.filter((_, j) => j !== i))}
                                  className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        {sha256.length < 3 ? (
                          <button
                            type="button"
                            onClick={() => addShaSlot("sha256")}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
                          >
                            <Plus className="size-3" /> Add another SHA-256
                          </button>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold">SHA-1 fingerprints (optional)</p>
                        <ul className="mt-2 space-y-2">
                          {sha1.map((val, i) => (
                            <li key={i} className="flex gap-2">
                              <input
                                value={val}
                                onChange={(e) => updateSha("sha1", i, e.target.value)}
                                className="min-w-0 flex-1 rounded-xl bg-surface px-3 py-2 text-[11px] font-mono ring-1 ring-border"
                                placeholder="Optional SHA-1"
                              />
                            </li>
                          ))}
                        </ul>
                        {sha1.length < 3 ? (
                          <button
                            type="button"
                            onClick={() => addShaSlot("sha1")}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent"
                          >
                            <Plus className="size-3" /> Add SHA-1
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-foreground">
                      <Apple className="size-4" /> iOS
                    </div>
                    <div className="space-y-3">
                      <Field
                        label="Bundle ID"
                        error={config.bundle_id && !bundleCheck.valid ? bundleCheck.message : undefined}
                      >
                        <input
                          value={config.bundle_id ?? ""}
                          onChange={(e) => setConfig((c) => ({ ...c, bundle_id: e.target.value }))}
                          className="w-full rounded-xl bg-surface px-3 py-2.5 text-[13px] ring-1 ring-border"
                          placeholder="com.example.myapp"
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Version">
                          <input
                            value={config.version_name ?? ""}
                            onChange={(e) => setConfig((c) => ({ ...c, version_name: e.target.value }))}
                            className="w-full rounded-xl bg-surface px-3 py-2.5 text-[13px] ring-1 ring-border"
                          />
                        </Field>
                        <Field label="Build number">
                          <input
                            type="number"
                            min={1}
                            value={config.ios_build_number ?? 1}
                            onChange={(e) =>
                              setConfig((c) => ({ ...c, ios_build_number: Number(e.target.value) || 1 }))
                            }
                            className="w-full rounded-xl bg-surface px-3 py-2.5 text-[13px] ring-1 ring-border"
                          />
                        </Field>
                      </div>
                      <p className="rounded-lg bg-muted/40 px-3 py-2 text-[10px] text-muted-foreground">
                        App Store Connect API keys are stored as encrypted project secrets — never shown here after save.
                      </p>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl px-4 py-2.5 text-[12px] font-semibold ring-1 ring-border"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || loading}
                onClick={() => void save()}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Save configuration"}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
