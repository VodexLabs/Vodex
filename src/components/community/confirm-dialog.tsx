"use client";

import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

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
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]" aria-label="Close" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-2xl bg-background p-5 shadow-2xl ring-1 ring-border"
      >
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        {description ? <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{description}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={destructive ? "destructive" : "accent"} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
