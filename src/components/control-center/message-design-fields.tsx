"use client";

import * as React from "react";
import {
  BACKGROUND_PRESETS,
  EFFECT_PRESETS,
  ICON_PRESETS,
  type MessageDesign,
} from "@/lib/control-center/message-design-presets";

type Props = {
  design: MessageDesign;
  onChange: (next: MessageDesign) => void;
  onReset: () => void;
};

export function MessageDesignFields({ design, onChange, onReset }: Props) {
  const patch = (partial: Partial<MessageDesign>) => onChange({ ...design, ...partial });

  return (
    <div className="space-y-3 rounded-lg border border-border/80 bg-background/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Visual design</p>
        <button type="button" onClick={onReset} className="text-[11px] font-medium text-accent hover:underline">
          Reset to template
        </button>
      </div>
      <label className="block text-[11px] font-medium text-muted-foreground">
        Background
        <select
          value={design.backgroundPreset}
          onChange={(e) => patch({ backgroundPreset: e.target.value as MessageDesign["backgroundPreset"] })}
          className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[12px]"
        >
          {BACKGROUND_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
              {p.animated ? " (animated)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[11px] font-medium text-muted-foreground">
        Effect
        <select
          value={design.effectPreset}
          onChange={(e) => patch({ effectPreset: e.target.value as MessageDesign["effectPreset"] })}
          className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[12px]"
        >
          {EFFECT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[11px] font-medium text-muted-foreground">
        Icon
        <select
          value={design.iconPreset}
          onChange={(e) => patch({ iconPreset: e.target.value as MessageDesign["iconPreset"] })}
          className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[12px]"
        >
          {ICON_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-[12px]">
        <input
          type="checkbox"
          checked={design.animatedIconEnabled}
          onChange={(e) => patch({ animatedIconEnabled: e.target.checked })}
        />
        Animated icon
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-[10px] text-muted-foreground">
          Text
          <input
            type="color"
            value={design.textColor}
            onChange={(e) => patch({ textColor: e.target.value })}
            className="mt-1 h-8 w-full cursor-pointer rounded border border-border"
          />
        </label>
        <label className="text-[10px] text-muted-foreground">
          Accent
          <input
            type="color"
            value={design.accentColor}
            onChange={(e) => patch({ accentColor: e.target.value })}
            className="mt-1 h-8 w-full cursor-pointer rounded border border-border"
          />
        </label>
        <label className="text-[10px] text-muted-foreground">
          Outline
          <input
            type="color"
            value={design.outlineColor}
            onChange={(e) => patch({ outlineColor: e.target.value })}
            className="mt-1 h-8 w-full cursor-pointer rounded border border-border"
          />
        </label>
      </div>
    </div>
  );
}
