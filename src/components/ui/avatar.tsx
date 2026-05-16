"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// ─── Gradient palette (12 deterministic gradients) ───────────────────────────

const GRADIENTS = [
  "linear-gradient(135deg, #1e6bff 0%, #6366f1 100%)",   // blue → indigo
  "linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)",   // violet → fuchsia
  "linear-gradient(135deg, #0891b2 0%, #2563eb 100%)",   // cyan → blue
  "linear-gradient(135deg, #059669 0%, #0891b2 100%)",   // emerald → cyan
  "linear-gradient(135deg, #d97706 0%, #dc2626 100%)",   // amber → red
  "linear-gradient(135deg, #be185d 0%, #7c3aed 100%)",   // pink → violet
  "linear-gradient(135deg, #16a34a 0%, #059669 100%)",   // green → emerald
  "linear-gradient(135deg, #2563eb 0%, #0891b2 100%)",   // blue → cyan
  "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)",   // purple → pink
  "linear-gradient(135deg, #ca8a04 0%, #16a34a 100%)",   // yellow → green
  "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",   // slate → navy
  "linear-gradient(135deg, #dc2626 0%, #be185d 100%)",   // red → pink
];

/** Deterministic gradient based on first char of name */
function getGradient(name: string): string {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

/** Get initials — up to 2 characters */
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const sizeMap = {
  xs:  { wrapper: "size-6",  text: "text-[10px]" },
  sm:  { wrapper: "size-7",  text: "text-[11px]" },
  md:  { wrapper: "size-8",  text: "text-[12px]" },
  lg:  { wrapper: "size-10", text: "text-[14px]" },
  xl:  { wrapper: "size-14", text: "text-[18px]" },
  "2xl": { wrapper: "size-20", text: "text-[24px]" },
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof sizeMap;
  className?: string;
  /** Override ring style */
  ring?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Avatar({ name, src, size = "md", className, ring = true }: AvatarProps) {
  const { wrapper, text } = sizeMap[size];
  const gradient = getGradient(name);
  const initials = getInitials(name);

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        wrapper,
        ring && "ring-1 ring-border shadow-[var(--shadow-xs)]",
        className,
      )}
      style={src ? undefined : { background: gradient }}
    >
      {src ? (
        <Image src={src} alt={name} fill className="object-cover" sizes="80px" />
      ) : (
        <span
          className={cn(
            "select-none font-semibold tracking-tight text-white",
            text,
          )}
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.25)" }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}

// ─── Avatar Group (stacked) ───────────────────────────────────────────────────

export function AvatarGroup({
  users,
  max = 4,
  size = "sm",
}: {
  users: Array<{ name: string; src?: string | null }>;
  max?: number;
  size?: keyof typeof sizeMap;
}) {
  const shown = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <Avatar
          key={u.name + i}
          name={u.name}
          src={u.src}
          size={size}
          className={cn("-ml-2 first:ml-0 ring-2 ring-background")}
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "-ml-2 flex shrink-0 items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-semibold text-muted-foreground",
            sizeMap[size].wrapper,
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
