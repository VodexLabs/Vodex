"use client";

import * as React from "react";
import { Loader2, CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { parseJsonResponse } from "@/lib/api/safe-json";

const ANDROID_CHECKLIST = [
  "Google Play Console app exists",
  "Package name matches your wrapper config",
  "Billing products/subscriptions created",
  "License testers configured",
  "RevenueCat linked to Google Play",
  "Service account connected to RevenueCat if required",
];

const IOS_CHECKLIST = [
  "App Store Connect app exists",
  "Bundle ID matches your wrapper config",
  "IAP/subscriptions created in App Store Connect",
  "Sandbox tester configured",
  "RevenueCat linked to App Store",
];

export function MobileBillingWizard({ projectId }: { projectId: string }) {
  const [step, setStep] = React.useState(0);
  const [platform, setPlatform] = React.useState<"android" | "ios" | "both">("both");
  const [packageName, setPackageName] = React.useState("");
  const [bundleId, setBundleId] = React.useState("");
  const [publicSdkKey, setPublicSdkKey] = React.useState("");
  const [secretApiKey, setSecretApiKey] = React.useState("");
  const [entitlementId, setEntitlementId] = React.useState("premium");
  const [offeringId, setOfferingId] = React.useState("");
  const [productIds, setProductIds] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/mobile-billing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          platform,
          packageName: packageName.trim() || null,
          bundleId: bundleId.trim() || null,
          publicSdkKey: publicSdkKey.trim() || null,
          secretApiKey: secretApiKey.trim() || null,
          entitlementId: entitlementId.trim() || null,
          offeringId: offeringId.trim() || null,
          productIds: productIds
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean),
          setupStatus: "needs_store_setup",
        }),
      });
      const { data, error: parseErr } = await parseJsonResponse(res);
      if (parseErr || !data?.ok) throw new Error(parseErr ?? "Save failed");
      toast.success("Mobile billing settings saved");
      setStep(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function verifyRc() {
    const res = await fetch(`/api/projects/${projectId}/mobile-billing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ publicSdkKey, secretApiKey }),
    });
    const { data, error: parseErr } = await parseJsonResponse<{ ok?: boolean; message?: string }>(res);
    if (parseErr || !data?.ok) {
      toast.error(parseErr ?? "Verification failed");
      return;
    }
    toast.success(data.message ?? "RevenueCat verified");
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Smartphone className="size-5 text-accent" />
        <div>
          <p className="text-[14px] font-semibold">Mobile subscriptions</p>
          <p className="text-[11px] text-muted-foreground">
            Google Play and Apple process in-app purchases. RevenueCat helps your app verify
            purchases, unlock entitlements, and sync subscriptions.
          </p>
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-medium">Choose platform</p>
          <div className="flex gap-2">
            {(["android", "ios", "both"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[11px] font-medium capitalize",
                  platform === p ? "bg-accent text-white" : "ring-1 ring-border",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <Button type="button" size="sm" onClick={() => setStep(1)}>
            Continue
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <p className="text-[12px] font-medium">App identity</p>
          {(platform === "android" || platform === "both") && (
            <input
              className="w-full rounded-lg border border-border px-3 py-2 text-[13px]"
              placeholder="Android package name (com.example.app)"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
            />
          )}
          {(platform === "ios" || platform === "both") && (
            <input
              className="w-full rounded-lg border border-border px-3 py-2 text-[13px]"
              placeholder="iOS bundle ID (com.example.app)"
              value={bundleId}
              onChange={(e) => setBundleId(e.target.value)}
            />
          )}
          <Button type="button" size="sm" onClick={() => setStep(2)}>
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          <p className="text-[12px] font-medium">RevenueCat</p>
          <input
            type="text"
            className="w-full rounded-lg border border-border px-3 py-2 text-[13px]"
            placeholder="Public SDK key (goog_… or appl_…)"
            value={publicSdkKey}
            onChange={(e) => setPublicSdkKey(e.target.value)}
          />
          <input
            type="password"
            className="w-full rounded-lg border border-border px-3 py-2 text-[13px]"
            placeholder="Secret API key (server only)"
            value={secretApiKey}
            onChange={(e) => setSecretApiKey(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-border px-3 py-2 text-[13px]"
            placeholder="Entitlement ID"
            value={entitlementId}
            onChange={(e) => setEntitlementId(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-border px-3 py-2 text-[13px]"
            placeholder="Offering ID (optional)"
            value={offeringId}
            onChange={(e) => setOfferingId(e.target.value)}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => void verifyRc()}>
            Verify RevenueCat
          </Button>
          <Button type="button" size="sm" onClick={() => setStep(3)}>
            Continue
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          <p className="text-[12px] font-medium">Store product IDs</p>
          <textarea
            className="w-full rounded-lg border border-border px-3 py-2 text-[13px] min-h-[80px]"
            placeholder="One product ID per line (Play + App Store)"
            value={productIds}
            onChange={(e) => setProductIds(e.target.value)}
          />
          <ul className="text-[10px] text-muted-foreground space-y-1">
            {(platform === "android" || platform === "both") &&
              ANDROID_CHECKLIST.map((c) => (
                <li key={c}>Android: {c}</li>
              ))}
            {(platform === "ios" || platform === "both") &&
              IOS_CHECKLIST.map((c) => (
                <li key={c}>iOS: {c}</li>
              ))}
          </ul>
          <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save mobile billing"}
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          <p className="text-[12px] font-medium">Mobile billing config saved. Complete store setup to go live.</p>
        </div>
      )}
    </div>
  );
}
