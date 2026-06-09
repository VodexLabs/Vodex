"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function BuildNoFilesYetCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mr-6 rounded-2xl bg-rose-50/60 px-3.5 py-3 ring-2 ring-rose-400/50 dark:bg-rose-950/20 sm:mr-10",
        className,
      )}
      data-testid="build-no-files-yet-card"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
        <div>
          <p className="text-[12px] font-semibold text-rose-800 dark:text-rose-200">
            No files generated yet
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-rose-700/90 dark:text-rose-300/90">
            The model has not returned usable source files in time. If the build pauses, use{" "}
            <span className="font-medium">Continue generation</span> to resume route-by-route — or
            try a faster model.
          </p>
        </div>
      </div>
    </div>
  );
}
