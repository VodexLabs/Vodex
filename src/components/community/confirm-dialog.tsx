"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { OverlayDialog } from "@/components/ui/overlay-dialog";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <OverlayDialog
      open={open}
      onClose={onCancel}
      layer="confirmation"
      panelClassName="max-w-sm"
      data-testid="community-confirm-dialog"
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent",
          destructive ? "from-red-500/10" : "from-accent/10",
        )}
      />
      <div className="relative flex items-start gap-3 px-5 pt-5">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
            destructive ? "bg-red-500/10 text-red-600 ring-red-500/20" : "bg-accent/10 text-accent ring-accent/20",
          )}
        >
          <AlertTriangle className="size-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="relative flex justify-end gap-2 px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium ring-1 ring-border hover:bg-muted"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[13px] font-semibold",
            destructive
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-accent text-white hover:bg-accent/90",
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </OverlayDialog>
  );
}
