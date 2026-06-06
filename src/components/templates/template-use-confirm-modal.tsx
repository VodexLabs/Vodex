"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Sparkles } from "lucide-react";
import Image from "next/image";

type Props = {
  open: boolean;
  templateName: string;
  previewUrl?: string | null;
  loading?: boolean;
  onUse: () => void;
  onCancel: () => void;
};

export function TemplateUseConfirmModal({
  open,
  templateName,
  previewUrl,
  loading,
  onUse,
  onCancel,
}: Props) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[10060] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          data-testid="template-use-confirm-modal"
        >
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            aria-label="Close"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="relative w-full max-w-sm overflow-hidden rounded-t-2xl bg-background shadow-2xl ring-1 ring-border sm:rounded-2xl"
          >
            {previewUrl ? (
              <div className="relative h-36 w-full bg-muted/30">
                <Image src={previewUrl} alt="" fill className="object-cover object-top" sizes="400px" />
              </div>
            ) : null}
            <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[15px] font-semibold text-foreground">Use this template?</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Do you want to use the template <span className="font-semibold text-foreground">&quot;{templateName}&quot;</span>?
                  </p>
                </div>
                <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 rounded-xl px-4 py-2.5 text-[13px] font-semibold ring-1 ring-border"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={onUse}
                  disabled={loading}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Use template
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
