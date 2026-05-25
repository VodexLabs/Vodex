"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Smartphone,
  Apple,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  ChevronDown,
  Rocket,
  Download,
  Shield,
  Bell,
  Camera,
  MapPin,
  Mic,
  Users,
  Upload,
  FileArchive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { mobileEntitlementsForPlan } from "@/lib/mobile/entitlements";
import type { MobileAppConfig, MobilePlatform, ReadinessItem } from "@/lib/mobile/types";
import { validateAndroidPackageId, validateIosBundleId } from "@/lib/mobile/package-validation";
import { MOBILE_SECRET_KEYS } from "@/lib/mobile/secrets";

type Props = {
  projectId: string;
  projectName: string;
  planId?: string;
  fileCount: number;
  hasPreview: boolean;
  iconUrl?: string | null;
  onAskForHelp: (prompt: string) => void;
};

type BuildJob = {
  id: string;
  platform: string;
  status: string;
  artifact_type?: string;
  artifact_url?: string | null;
  error_message?: string | null;
  logs?: string | null;
  created_at?: string;
};

const PERMISSIONS: Array<{ key: keyof MobileAppConfig["permissions"]; label: string; icon: React.ElementType; why: string }> = [
  { key: "camera", label: "Camera", icon: Camera, why: "Used if your app captures photos or scans codes" },
  { key: "photos", label: "Photos", icon: Upload, why: "Used if users pick images from their library" },
  { key: "location", label: "Location", icon: MapPin, why: "Used for maps, delivery, or nearby features" },
  { key: "push_notifications", label: "Push notifications", icon: Bell, why: "Alerts users about activity in your app" },
  { key: "file_upload", label: "File upload", icon: Upload, why: "Used when users attach files" },
  { key: "microphone", label: "Microphone", icon: Mic, why: "Used for voice notes or calls" },
  { key: "contacts", label: "Contacts", icon: Users, why: "Used when inviting or sharing with contacts" },
];

const STEPS = [
  "Choose platform",
  "App identity",
  "Assets",
  "Permissions",
  "Store readiness",
  "Build",
] as const;

function ReadinessMeter({ label, score }: { label: string; score: number | null }) {
  const v = score ?? 0;
  return (
    <div className="rounded-xl bg-white/90 px-3 py-2.5 ring-1 ring-border/70">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-foreground">{label}</span>
        <span className="text-[11px] font-bold text-accent">{score != null ? `${v}%` : "—"}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", v >= 70 ? "bg-emerald-500" : v >= 40 ? "bg-amber-500" : "bg-muted-foreground/40")}
          style={{ width: `${Math.min(100, v)}%` }}
        />
      </div>
    </div>
  );
}

function ItemRow({ item }: { item: ReadinessItem }) {
  return (
    <li className="flex items-start gap-2 rounded-lg bg-background/80 px-2.5 py-2 text-[11px] ring-1 ring-border/50">
      {item.status === "pass" ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
      ) : item.status === "warning" ? (
        <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
      ) : (
        <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      )}
      <div>
        <p className="font-medium text-foreground">{item.label}</p>
        <p className="text-muted-foreground">{item.detail}</p>
      </div>
    </li>
  );
}

export function MobileWrapperStudio({
  projectId,
  projectName,
  planId = "free",
  fileCount,
  hasPreview,
  iconUrl,
  onAskForHelp,
}: Props) {
  const entitlements = mobileEntitlementsForPlan(planId);
  const canView = entitlements.mobile_wrapper_view;
  const locked = !entitlements.mobile_android_build && !entitlements.mobile_ios_build;

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [building, setBuilding] = React.useState<null | "android" | "ios">(null);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [config, setConfig] = React.useState<Partial<MobileAppConfig>>({});
  const [readiness, setReadiness] = React.useState<{
    android: number | null;
    ios: number | null;
    store: number | null;
    items: ReadinessItem[];
  }>({ android: null, ios: null, store: null, items: [] });
  const [jobs, setJobs] = React.useState<BuildJob[]>([]);
  const [wrapperType, setWrapperType] = React.useState<"capacitor" | "twa">("capacitor");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, jobsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/mobile/config`, { credentials: "include" }),
        fetch(`/api/projects/${projectId}/mobile/build`, { credentials: "include" }),
      ]);
      const cfgJson = (await cfgRes.json()) as { config?: Partial<MobileAppConfig> };
      const jobsJson = (await jobsRes.json()) as { jobs?: BuildJob[] };
      if (cfgJson.config) {
        setConfig(cfgJson.config);
        setWrapperType(cfgJson.config.wrapper_type ?? "capacitor");
        setReadiness({
          android: cfgJson.config.readiness_android ?? null,
          ios: cfgJson.config.readiness_ios ?? null,
          store: cfgJson.config.readiness_store ?? null,
          items: [],
        });
      }
      setJobs(jobsJson.jobs ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig(patch: Partial<MobileAppConfig>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/mobile/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, wrapper_type: wrapperType }),
        credentials: "include",
      });
      const json = (await res.json()) as { config?: Partial<MobileAppConfig>; error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Could not save");
        return;
      }
      if (json.config) setConfig(json.config);
      toast.success("Saved");
    } finally {
      setSaving(false);
    }
  }

  async function runReadinessScan() {
    setScanning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/mobile/readiness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      const json = (await res.json()) as {
        scores?: { android: number; ios: number; store: number };
        results?: Array<{ platform: string; score: number; items: ReadinessItem[] }>;
        actionCreditsCharged?: number;
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Scan failed");
        return;
      }
      const allItems = (json.results ?? []).flatMap((r) => r.items);
      setReadiness({
        android: json.scores?.android ?? null,
        ios: json.scores?.ios ?? null,
        store: json.scores?.store ?? null,
        items: allItems,
      });
      toast.success(
        json.actionCreditsCharged === 0
          ? "Readiness scan complete — no Action Credits used"
          : "Readiness scan complete",
      );
    } finally {
      setScanning(false);
    }
  }

  async function startBuild(platform: "android" | "ios", artifactType: "wrapper_zip" | "aab") {
    setBuilding(platform);
    try {
      const res = await fetch(`/api/projects/${projectId}/mobile/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          artifactType,
          wrapperType,
          approved: true,
        }),
        credentials: "include",
      });
      const json = (await res.json()) as {
        requiresApproval?: boolean;
        quote?: { actionCredits: number; label: string };
        job?: BuildJob;
        downloadUrl?: string;
        error?: string;
        locked?: boolean;
      };
      if (json.locked) {
        toast.error(json.error ?? "Upgrade required");
        return;
      }
      if (json.requiresApproval && json.quote) {
        toast.info(json.quote.label);
        return;
      }
      if (!res.ok) {
        toast.error(json.error ?? "Build could not start");
        return;
      }
      if (json.job) setJobs((prev) => [json.job!, ...prev]);
      if (json.downloadUrl) {
        toast.success("Wrapper project ready — download started");
        window.open(json.downloadUrl, "_blank", "noopener,noreferrer");
      } else if (json.job?.status === "requires_builder_config") {
        toast.info("Wrapper prepared. Binary build needs a connected builder — see build log.");
      } else {
        toast.success("Build recorded");
      }
      void load();
    } finally {
      setBuilding(null);
    }
  }

  function togglePlatform(p: MobilePlatform) {
    const current = config.platforms ?? [];
    const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
    setConfig((c) => ({ ...c, platforms: next }));
    void saveConfig({ platforms: next });
  }

  if (!canView) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-[13px] text-muted-foreground">Sign in to set up a mobile app.</p>
      </div>
    );
  }

  if (fileCount === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Smartphone className="size-10 text-muted-foreground/50" strokeWidth={1.25} />
        <p className="text-[14px] font-semibold text-foreground">Build your app first</p>
        <p className="max-w-sm text-[12px] text-muted-foreground">
          Mobile wrapping needs a generated or imported app. Run a build from the Build tab, then return here.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-[13px]">Loading mobile setup…</span>
      </div>
    );
  }

  const pkgValid = validateAndroidPackageId(config.package_id);
  const bundleValid = validateIosBundleId(config.bundle_id ?? config.package_id);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-[#f4f7ff] to-background">
      <div className="shrink-0 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border bg-white">
              {iconUrl || config.icon_url ? (
                <Image src={config.icon_url ?? iconUrl!} alt="" width={48} height={48} className="size-full object-cover" unoptimized />
              ) : (
                <div className="flex size-full items-center justify-center bg-accent/10">
                  <Smartphone className="size-5 text-accent" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-foreground">{config.app_name ?? projectName}</p>
              <p className="text-[11px] text-muted-foreground">
                Web app {hasPreview ? "ready" : "building"} · {fileCount} files
              </p>
            </div>
          </div>
          {!locked ? (
            <button
              type="button"
              onClick={() => void runReadinessScan()}
              disabled={scanning}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-accent/90 disabled:opacity-60"
            >
              {scanning ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Run readiness scan
            </button>
          ) : (
            <Link
              href="/settings/billing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-[11px] font-semibold text-white"
            >
              <Lock className="size-3.5" />
              Upgrade to build
            </Link>
          )}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Readiness scans are free. Cloud builds may use Action Credits — quoted before you confirm.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {locked && (
          <div className="mb-4 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-teal-500/5 p-5 text-center">
            <Lock className="mx-auto size-8 text-accent" strokeWidth={1.5} />
            <p className="mt-2 text-[14px] font-semibold text-foreground">Mobile apps on DreamOS86</p>
            <p className="mx-auto mt-1 max-w-md text-[12px] text-muted-foreground">
              Preview the checklist and plan your Android or iPhone app. Upgrade to generate wrapper projects and store-ready builds.
            </p>
          </div>
        )}

        <div className="mb-4 grid grid-cols-3 gap-2">
          <ReadinessMeter label="Android" score={readiness.android} />
          <ReadinessMeter label="iPhone" score={readiness.ios} />
          <ReadinessMeter label="Store prep" score={readiness.store} />
        </div>

        <Section title="1 · Choose platform">
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                { id: "android" as const, label: "Android", icon: Smartphone },
                { id: "ios" as const, label: "iPhone", icon: Apple },
              ] as const
            ).map(({ id, label, icon: Icon }) => {
              const selected = (config.platforms ?? []).includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePlatform(id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl px-4 py-4 ring-1 transition",
                    selected ? "bg-accent/10 ring-accent/40" : "bg-white/90 ring-border hover:ring-accent/25",
                  )}
                >
                  <Icon className={cn("size-6", selected ? "text-accent" : "text-muted-foreground")} strokeWidth={1.5} />
                  <span className="text-[12px] font-semibold text-foreground">{label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setConfig((c) => ({ ...c, platforms: ["android", "ios"] }));
                void saveConfig({ platforms: ["android", "ios"] });
              }}
              className="flex flex-col items-center gap-2 rounded-xl bg-white/90 px-4 py-4 ring-1 ring-border hover:ring-accent/25"
            >
              <div className="flex -space-x-1">
                <Smartphone className="size-5 text-accent" />
                <Apple className="size-5 text-accent" />
              </div>
              <span className="text-[12px] font-semibold text-foreground">Both</span>
            </button>
          </div>
          <HelpButton
            label="Help me choose Android or iPhone"
            onHelp={() =>
              onAskForHelp(
                `Help me decide whether to wrap my app "${config.app_name ?? projectName}" for Android, iPhone, or both. Current platforms selected: ${(config.platforms ?? []).join(", ") || "none"}.`,
              )
            }
          />
        </Section>

        <Section title="2 · App identity">
          <Field label="App name" value={config.app_name ?? ""} onChange={(v) => setConfig((c) => ({ ...c, app_name: v }))} onBlur={() => void saveConfig({ app_name: config.app_name })} />
          <Field label="Short name" value={config.short_name ?? ""} onChange={(v) => setConfig((c) => ({ ...c, short_name: v }))} onBlur={() => void saveConfig({ short_name: config.short_name })} hint="Home screen label (12 chars max)" />
          <Field label="Description" value={config.app_description ?? ""} onChange={(v) => setConfig((c) => ({ ...c, app_description: v }))} onBlur={() => void saveConfig({ app_description: config.app_description })} multiline />
          <Field
            label="Android app ID"
            value={config.package_id ?? ""}
            onChange={(v) => setConfig((c) => ({ ...c, package_id: v }))}
            onBlur={() => void saveConfig({ package_id: config.package_id, bundle_id: config.bundle_id ?? config.package_id })}
            error={config.package_id && !pkgValid.valid ? pkgValid.message : undefined}
            hint="Unique ID for your Android app (e.g. com.company.appname)"
          />
          <Field
            label="iPhone app ID"
            value={config.bundle_id ?? ""}
            onChange={(v) => setConfig((c) => ({ ...c, bundle_id: v }))}
            onBlur={() => void saveConfig({ bundle_id: config.bundle_id })}
            error={config.bundle_id && !bundleValid.valid ? bundleValid.message : undefined}
            hint="Unique ID for your iPhone app"
          />
          <div className="grid grid-cols-3 gap-2">
            <Field label="Version" value={config.version_name ?? "0.0.1"} onChange={(v) => setConfig((c) => ({ ...c, version_name: v }))} onBlur={() => void saveConfig({ version_name: config.version_name })} />
            <Field label="Android code" value={String(config.android_version_code ?? 1)} onChange={(v) => setConfig((c) => ({ ...c, android_version_code: parseInt(v, 10) || 1 }))} onBlur={() => void saveConfig({ android_version_code: config.android_version_code })} />
            <Field label="iOS build" value={String(config.ios_build_number ?? 1)} onChange={(v) => setConfig((c) => ({ ...c, ios_build_number: parseInt(v, 10) || 1 }))} onBlur={() => void saveConfig({ ios_build_number: config.ios_build_number })} />
          </div>
          <HelpButton label="Help me choose app IDs" onHelp={() => onAskForHelp(`Suggest valid Android and iPhone app IDs for my app "${config.app_name ?? projectName}".`)} />
          {saving ? <p className="text-[10px] text-muted-foreground">Saving…</p> : null}
        </Section>

        <Section title="3 · Assets">
          <button
            type="button"
            className="mb-2 text-[11px] font-semibold text-accent hover:underline"
            onClick={() => {
              if (iconUrl) {
                setConfig((c) => ({ ...c, icon_url: iconUrl }));
                void saveConfig({ icon_url: iconUrl });
                toast.success("Synced icon from your app");
              }
            }}
          >
            Sync icon from app
          </button>
          <p className="text-[11px] text-muted-foreground">
            Icon: {config.icon_url ? "Ready" : "Missing — sync or upload in Advanced"}
          </p>
          <HelpButton label="Help me prepare store icons" onHelp={() => onAskForHelp("Explain what icon sizes I need for Google Play and the App Store for my app.")} />
        </Section>

        <Section title="4 · Permissions">
          <div className="space-y-2">
            {PERMISSIONS.map(({ key, label, icon: Icon, why }) => (
              <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg bg-white/80 px-3 py-2 ring-1 ring-border/60">
                <input
                  type="checkbox"
                  checked={Boolean(config.permissions?.[key])}
                  onChange={(e) => {
                    const permissions = { ...config.permissions, [key]: e.target.checked };
                    setConfig((c) => ({ ...c, permissions }));
                    void saveConfig({ permissions });
                  }}
                  className="mt-1"
                />
                <div>
                  <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                    <Icon className="size-3.5 text-accent" />
                    {label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{why}</p>
                </div>
              </label>
            ))}
          </div>
        </Section>

        {readiness.items.length > 0 && (
          <Section title="5 · Readiness results">
            <ul className="max-h-64 space-y-1.5 overflow-y-auto">
              {readiness.items.slice(0, 24).map((item) => (
                <ItemRow key={`${item.platform}-${item.id}`} item={item} />
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-muted-foreground">Scans are deterministic — 0 Action Credits.</p>
          </Section>
        )}

        <Section title="6 · Build center">
          <div className="flex flex-wrap gap-2">
            <BuildBtn
              label="Store-ready project"
              sub="Download your app package — free"
              busy={building === "android"}
              disabled={locked}
              onClick={() => void startBuild("android", "wrapper_zip")}
              icon={FileArchive}
            />
            <BuildBtn
              label="Android store build"
              sub="Quoted before run"
              busy={building === "android"}
              disabled={locked || !entitlements.mobile_android_build}
              onClick={() => void startBuild("android", "aab")}
              icon={Rocket}
            />
            <BuildBtn
              label="iPhone store build"
              sub="Requires Apple setup"
              busy={building === "ios"}
              disabled={locked || !entitlements.mobile_ios_build}
              onClick={() => void startBuild("ios", "wrapper_zip")}
              icon={Apple}
            />
          </div>
          {jobs.length > 0 && (
            <ul className="mt-3 space-y-2">
              {jobs.slice(0, 5).map((j) => (
                <li key={j.id} className="rounded-lg bg-muted/40 px-3 py-2 text-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium capitalize text-foreground">
                      {j.platform} · {j.artifact_type ?? "build"}
                    </span>
                    <span className="capitalize text-muted-foreground">{j.status.replace(/_/g, " ")}</span>
                  </div>
                  {j.error_message ? <p className="mt-1 text-destructive">{j.error_message}</p> : null}
                  {j.artifact_url && j.status === "success" ? (
                    <a href={j.artifact_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-accent hover:underline">
                      <Download className="size-3" />
                      Download
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="rounded-2xl border border-border/70 bg-white/80">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <p className="text-[12px] font-semibold text-foreground">Advanced</p>
              <p className="text-[11px] text-muted-foreground">Wrapper type, credentials, store upload</p>
            </div>
            <ChevronDown className={cn("size-4 transition", advancedOpen && "rotate-180")} />
          </button>
          {advancedOpen && (
            <div className="space-y-3 border-t border-border/60 px-4 pb-4 pt-3">
              <div className="flex gap-2">
                {(["capacitor", "twa"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setWrapperType(t);
                      void saveConfig({ wrapper_type: t });
                    }}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[11px] font-semibold ring-1",
                      wrapperType === t ? "bg-accent text-white ring-accent" : "bg-muted text-foreground ring-border",
                    )}
                  >
                    {t === "capacitor" ? "Capacitor (recommended)" : "TWA (web-only)"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Store credentials are saved securely — never in chat.
              </p>
              <HelpButton
                label="Help me connect Google Play or App Store"
                onHelp={() =>
                  onAskForHelp(
                    "Guide me through connecting Google Play service account or App Store Connect API for mobile publishing. Do not ask me to paste secrets in chat — tell me to use secure setup fields.",
                  )
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl bg-white/95 p-4 shadow-sm ring-1 ring-border/60">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  hint,
  error,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  hint?: string;
  error?: string;
  multiline?: boolean;
}) {
  return (
    <label className="mb-2 block">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          rows={2}
          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[12px]"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-[12px]"
        />
      )}
      {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
      {error ? <span className="block text-[10px] text-destructive">{error}</span> : null}
    </label>
  );
}

function HelpButton({ label, onHelp }: { label: string; onHelp: () => void }) {
  return (
    <button
      type="button"
      onClick={onHelp}
      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
    >
      <Sparkles className="size-3" />
      Ask DreamOS86 to help
    </button>
  );
}

function BuildBtn({
  label,
  sub,
  busy,
  disabled,
  onClick,
  icon: Icon,
}: {
  label: string;
  sub: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ElementType;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className="flex min-w-[140px] flex-1 flex-col items-start gap-1 rounded-xl bg-surface px-3 py-2.5 text-left ring-1 ring-border hover:ring-accent/30 disabled:opacity-50"
    >
      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Icon className="size-3.5 text-accent" />}
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground">{sub}</span>
    </button>
  );
}
