"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { extractEditableRegions, type EditableRegion } from "@/lib/preview/extract-editable-regions";

type RegionBox = {
  id: string;
  label: string;
  tag: string;
  top: number;
  left: number;
  width: number;
  height: number;
};

export function PreviewEditOverlay({
  iframeRef,
  iframeLoaded,
  onSelect,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  iframeLoaded: boolean;
  onSelect: (info: { section: string; tag: string }) => void;
}) {
  const [boxes, setBoxes] = React.useState<RegionBox[]>([]);
  const [hovered, setHovered] = React.useState<string | null>(null);

  const rescan = React.useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const iframeRect = iframe.getBoundingClientRect();
      const regions = extractEditableRegions(doc);
      const next: RegionBox[] = regions
        .map((r: EditableRegion) => {
          const rect = (r.element as HTMLElement).getBoundingClientRect();
          return {
            id: r.id,
            label: r.label,
            tag: r.tag,
            top: rect.top - iframeRect.top,
            left: rect.left - iframeRect.left,
            width: rect.width,
            height: rect.height,
          };
        })
        .filter((b) => b.width >= 20 && b.height >= 14);
      setBoxes(next);
    } catch {
      setBoxes([]);
    }
  }, [iframeRef]);

  React.useEffect(() => {
    if (!iframeLoaded) return;
    rescan();
    const iframe = iframeRef.current;
    const win = iframe?.contentWindow;
    win?.addEventListener("resize", rescan);
    win?.addEventListener("scroll", rescan);
    return () => {
      win?.removeEventListener("resize", rescan);
      win?.removeEventListener("scroll", rescan);
    };
  }, [iframeLoaded, rescan, iframeRef]);

  if (!iframeLoaded || boxes.length === 0) {
    return (
      <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center pb-6">
        <div className="rounded-xl bg-background/90 px-4 py-2 text-[12px] font-medium text-foreground shadow-lg ring-1 ring-border backdrop-blur">
          {iframeLoaded ? "Scanning preview for editable regions…" : "Load preview to select elements"}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30">
      {boxes.map((box) => (
        <button
          key={box.id}
          type="button"
          onMouseEnter={() => setHovered(box.id)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelect({ section: box.label, tag: box.tag })}
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
          }}
          className="absolute cursor-crosshair rounded-md border border-transparent transition hover:border-accent/70 hover:bg-accent/10"
        >
          {hovered === box.id && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "pointer-events-none absolute -top-7 left-0 max-w-[220px] truncate rounded-md px-2 py-0.5",
                "bg-accent text-[10px] font-semibold text-white shadow-md",
              )}
            >
              {box.label}
              <span className="ml-1 opacity-75">&lt;{box.tag}&gt;</span>
            </motion.span>
          )}
        </button>
      ))}
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-background/90 px-4 py-2 text-[12px] font-medium text-foreground shadow-lg ring-1 ring-border backdrop-blur">
        Click an element in the preview to target it for editing
      </div>
    </div>
  );
}
