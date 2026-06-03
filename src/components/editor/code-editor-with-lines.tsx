"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  activePath?: string | null;
  className?: string;
};

/** Monaco-style editor with synchronized line numbers and file path header. */
export function CodeEditorWithLines({
  value,
  onChange,
  readOnly,
  placeholder,
  activePath,
  className,
}: Props) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const gutterRef = React.useRef<HTMLDivElement>(null);
  const lineCount = Math.max(1, value.split("\n").length);

  const syncScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0d1117]", className)}>
      {activePath ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#161b22] px-3 py-1.5">
          <span className="truncate font-mono text-[11px] text-emerald-400/90">{activePath}</span>
          <span className="ml-auto text-[10px] tabular-nums text-white/35">{lineCount} lines</span>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={gutterRef}
          aria-hidden
          className="shrink-0 select-none overflow-hidden border-r border-white/10 bg-[#0d1117] px-2.5 py-3 text-right font-mono text-[11px] leading-[1.625rem] text-white/30"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onScroll={syncScroll}
          readOnly={readOnly}
          spellCheck={false}
          placeholder={placeholder}
          className="min-h-0 flex-1 resize-none overflow-auto overscroll-contain bg-transparent px-3 py-3 font-mono text-[11px] leading-[1.625rem] text-[#e6edf3] outline-none placeholder:text-white/25"
        />
      </div>
    </div>
  );
}
