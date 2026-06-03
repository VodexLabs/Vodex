"use client";

import { cn } from "@/lib/utils";
import {
  backgroundClass,
  effectOverlayClass,
  type MessageDesign,
} from "@/lib/control-center/message-design-presets";
import { MessageDesignIcon } from "@/components/control-center/message-design-icon";

/** Compact preview matching notification popover row — not stretched. */
export function InboxNotificationPreview({
  title,
  message,
  design,
}: {
  title: string;
  message: string;
  design: MessageDesign;
}) {
  const effectCls = effectOverlayClass(design.effectPreset);

  return (
    <div
      className="flex min-h-[200px] items-start justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6"
      data-testid="admin-inbox-preview-panel"
    >
      <button
        type="button"
        className={cn(
          "relative flex w-full max-w-[320px] items-center gap-3 rounded-xl border px-4 py-2.5 text-left shadow-[var(--shadow-xs)]",
          backgroundClass(design.backgroundPreset),
          effectCls,
        )}
        style={{
          borderColor: design.outlineColor || undefined,
          color: design.textColor,
        }}
        data-testid="admin-inbox-preview"
      >
        <MessageDesignIcon preset={design.iconPreset} animated={design.animatedIconEnabled} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[12.5px] font-semibold leading-snug">{title || "Title"}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug opacity-80">
            {message || "Message body"}
          </p>
        </div>
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: design.accentColor }} />
      </button>
    </div>
  );
}
