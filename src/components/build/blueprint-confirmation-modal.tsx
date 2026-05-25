"use client";

import * as React from "react";
import { X, Rocket, Minimize2 } from "lucide-react";
import type { AppBlueprint } from "@/lib/build/blueprint-schema";
import { AppBlueprintPanel } from "@/components/build/app-blueprint-panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  blueprint: AppBlueprint | null;
  loading?: boolean;
  onClose: () => void;
  onBuildNow: () => void;
  onEditBlueprint: () => void;
  onStartSmaller?: () => void;
};

export function BlueprintConfirmationModal({
  open,
  blueprint,
  loading,
  onClose,
  onBuildNow,
  onEditBlueprint,
  onStartSmaller,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className={cn(
          "flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[14px] font-semibold text-foreground">Review your app plan</p>
            <p className="text-[12px] text-muted-foreground">
              We&apos;ll use this plan to create the first working version of your app.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading || !blueprint ? (
            <p className="text-[13px] text-muted-foreground">Creating your app plan…</p>
          ) : (
            <AppBlueprintPanel blueprint={blueprint} showCreditReserve />
          )}
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button type="button" className="flex-1" onClick={onBuildNow} disabled={!blueprint || loading}>
              <Rocket className="size-4" />
              Build now
            </Button>
            <Button type="button" variant="secondary" onClick={onEditBlueprint} disabled={!blueprint}>
              Edit plan
            </Button>
            {onStartSmaller ? (
              <Button type="button" variant="ghost" size="sm" onClick={onStartSmaller}>
                <Minimize2 className="size-3.5" />
                Start smaller
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Build Credits are charged only for completed work. Some credits may be reserved during the build —
            unused credits are returned automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
