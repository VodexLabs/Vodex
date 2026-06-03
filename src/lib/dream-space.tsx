"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";
import { resolveWorkspaceDisplayName } from "@/lib/profile/default-workspace-name";
import { cn } from "@/lib/utils";

/**
 * Primary shell identity: the user’s workspace profile (name + icon on `profiles`),
 * combined account + workspace concept — labeled “Your Space” in the product shell.
 */
export function resolveDreamSpaceLabel(
  profile: Profile | null | undefined,
  user: User | null | undefined,
): string {
  const email = (profile?.email || user?.email || "").trim();
  return resolveWorkspaceDisplayName(profile?.workspace_name, email || null);
}

/** Up to two characters for avatar / token ring (letters, digits, handles short labels). */
export function dreamSpaceInitials(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";

  const possessive = /^(.+?)'s\s+(?:Dream Space|Your Space)$/iu.exec(trimmed);
  if (possessive) {
    const raw = possessive[1]!;
    const alnum = raw.replace(/[^\p{L}\p{N}]/gu, "");
    if (alnum.length >= 2) return (alnum[0]! + alnum[1]!).toUpperCase();
    if (alnum.length === 1) return alnum.toUpperCase();
  }

  const parts = trimmed.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p));
  if (parts.length === 0) {
    const alnum = trimmed.replace(/[^\p{L}\p{N}]/gu, "");
    if (alnum.length >= 2) return (alnum[0]! + alnum[1]!).toUpperCase();
    return trimmed.charAt(0).toUpperCase();
  }
  if (parts.length === 1) {
    const w = parts[0]!;
    const alnum = w.replace(/[^\p{L}\p{N}]/gu, "");
    if (alnum.length >= 2) return (alnum[0]! + alnum[1]!).toUpperCase();
    return w.charAt(0).toUpperCase();
  }
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function DreamSpaceGlyph({
  iconUrl,
  label,
  sizeClass,
  textClassName,
  className,
}: {
  iconUrl: string | null | undefined;
  label: string;
  /** Tailwind size for wrapper, e.g. size-8 */
  sizeClass: string;
  /** Classes for initials (icon absent), e.g. text-lg */
  textClassName?: string;
  className?: string;
}) {
  const initials = dreamSpaceInitials(label);
  const [iconFailed, setIconFailed] = React.useState(false);
  const showCustomIcon = Boolean(iconUrl?.trim()) && !iconFailed;

  React.useEffect(() => {
    setIconFailed(false);
  }, [iconUrl]);

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl ring-2 ring-accent/25 shadow-sm",
        showCustomIcon ? "bg-background" : "bg-gradient-to-br from-accent to-violet-600",
        sizeClass,
        className,
      )}
    >
      {showCustomIcon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconUrl!}
          alt=""
          className="size-full object-cover"
          onError={() => setIconFailed(true)}
        />
      ) : (
        <span
          className={cn(
            "flex size-full items-center justify-center font-bold tracking-wide text-white",
            textClassName ?? "text-[11px]",
          )}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
