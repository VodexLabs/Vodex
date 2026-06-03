"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  backgroundClass,
  effectOverlayClass,
  type MessageDesign,
} from "@/lib/control-center/message-design-presets";
import { MessageDesignIcon } from "@/components/control-center/message-design-icon";

/** Horizontal top-bar banner preview. */
export function TopbarBannerPreview({
  title,
  message,
  linkLabel,
  design,
  dismissible = true,
}: {
  title: string;
  message: string;
  linkLabel?: string;
  design: MessageDesign;
  dismissible?: boolean;
}) {
  const effectCls = effectOverlayClass(design.effectPreset);
  const onDark =
    design.backgroundPreset === "critical_red_pulse" ||
    design.backgroundPreset === "dark_premium" ||
    design.backgroundPreset.startsWith("animated_");

  return (
    <div
      className="rounded-lg border border-dashed border-border bg-muted/20 p-3"
      data-testid="admin-announcement-preview-wrap"
    >
      <div
        className={cn(
          "relative flex min-h-[44px] w-full items-center gap-3 overflow-hidden rounded-lg px-4 py-2.5 text-[13px] shadow-md",
          backgroundClass(design.backgroundPreset),
          effectCls,
        )}
        style={{
          color: design.textColor,
          outline: design.outlineColor ? `1px solid ${design.outlineColor}` : undefined,
        }}
        data-testid="admin-announcement-preview"
      >
        <MessageDesignIcon preset={design.iconPreset} animated={design.animatedIconEnabled} size="sm" />
        <div className="min-w-0 flex-1">
          <span className="font-semibold">{title || "Announcement title"}</span>
          <span className="mx-1.5 opacity-60">·</span>
          <span className="opacity-95">
            {message || "Message preview"}
            {linkLabel ? (
              <span className="ml-1 underline underline-offset-2" style={{ color: design.accentColor }}>
                {linkLabel}
              </span>
            ) : null}
          </span>
        </div>
        {dismissible ? (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md",
              onDark ? "text-white/80" : "text-foreground/60",
            )}
            aria-hidden
          >
            <X className="size-4" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
