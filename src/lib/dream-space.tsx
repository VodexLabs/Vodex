import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";
import { resolveDisplayName } from "@/lib/profile-display";
import { cn } from "@/lib/utils";

/**
 * Primary shell identity: the user’s workspace profile (name + icon on `profiles`),
 * combined account + workspace concept — labeled “Dream Space” in the product.
 */
export function resolveDreamSpaceLabel(
  profile: Profile | null | undefined,
  user: User | null | undefined,
): string {
  const w = profile?.workspace_name?.trim();
  if (w) return w;

  const dn = resolveDisplayName(profile, user);
  if (dn && dn !== "User") {
    const first = dn.split(/\s+/)[0]!;
    return `${first}'s Dream Space`;
  }

  const email = (profile?.email || user?.email || "").trim();
  if (email) {
    const prefix = email.split("@")[0]?.trim();
    if (prefix) return `${prefix}'s Dream Space`;
  }

  return "Dream Space";
}

/** Up to two characters for avatar / token ring (letters, digits, handles short labels). */
export function dreamSpaceInitials(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "?";

  const possessive = /^(.+?)'s\s+Dream Space$/iu.exec(trimmed);
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
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/45 ring-1 ring-border",
        sizeClass,
        className,
      )}
    >
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        <span
          className={cn(
            "flex size-full items-center justify-center bg-gradient-to-br from-accent to-violet-600 font-bold tracking-wide text-white shadow-inner",
            textClassName ?? "text-[11px]",
          )}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
