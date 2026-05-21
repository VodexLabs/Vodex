import { cn } from "@/lib/utils";

/** Canonical transparent DreamOS86 platform mark (not user/project app icons). */
export const DREAMOS86_BRAND_ICON_VERSION = "15";
export const DREAMOS86_BRAND_ICON_SRC = `/brand/dreamos86-icon.png?v=${DREAMOS86_BRAND_ICON_VERSION}`;

/** Named UI sizes — favicon assets are separate and must not use these. */
export type DreamOS86BrandIconSize =
  | "tiny"
  | "sm"
  | "md"
  | "lg"
  | "hero"
  | "auth"
  | "sidebar"
  | "mobile"
  | "collapsedSidebar"
  | "assistantAvatar"
  | "previewHero";

/** @deprecated Use DreamOS86BrandIconSize — aliases kept for existing call sites. */
export type DreamOS86BrandIconVariant =
  | DreamOS86BrandIconSize
  | "xs"
  | "xl"
  | "header"
  | "landingDesktop"
  | "landingMobile"
  | "create"
  | "drawer"
  | "assistant";

const SIZE_PX: Record<DreamOS86BrandIconSize, number> = {
  tiny: 22,
  sm: 30,
  md: 40,
  lg: 56,
  hero: 72,
  auth: 38,
  sidebar: 40,
  mobile: 38,
  collapsedSidebar: 44,
  assistantAvatar: 32,
  previewHero: 72,
};

const LEGACY_VARIANT_PX: Record<DreamOS86BrandIconVariant, number> = {
  ...SIZE_PX,
  xs: SIZE_PX.tiny,
  xl: SIZE_PX.hero,
  header: SIZE_PX.mobile,
  landingDesktop: SIZE_PX.md,
  landingMobile: SIZE_PX.mobile,
  create: SIZE_PX.md,
  drawer: SIZE_PX.sidebar,
  assistant: SIZE_PX.assistantAvatar,
};

function resolvePx(size?: number, variant?: DreamOS86BrandIconVariant): number {
  if (typeof size === "number" && size > 0) return Math.round(size);
  if (variant) return LEGACY_VARIANT_PX[variant] ?? SIZE_PX.md;
  return SIZE_PX.md;
}

export type DreamOS86BrandIconProps = {
  /** Named size or explicit pixel width/height. */
  size?: DreamOS86BrandIconSize | DreamOS86BrandIconVariant | number;
  /** @deprecated Prefer `size` — still supported. */
  variant?: DreamOS86BrandIconVariant;
  className?: string;
  alt?: string;
  priority?: boolean;
};

/**
 * DreamOS86 platform branding — transparent cloud PNG only, no background tile.
 */
export function DreamOS86BrandIcon({
  size,
  variant,
  className,
  alt = "DreamOS86",
  priority = false,
}: DreamOS86BrandIconProps) {
  const namedSize =
    typeof size === "string" && !(typeof size === "number") ? (size as DreamOS86BrandIconVariant) : undefined;
  const numericSize = typeof size === "number" ? size : undefined;
  const px = resolvePx(numericSize, namedSize ?? variant);
  const enforced = namedSize === "tiny" || variant === "xs" ? px : Math.max(22, px);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={DREAMOS86_BRAND_ICON_SRC}
      alt={alt}
      width={enforced}
      height={enforced}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: enforced, height: enforced, minWidth: enforced, minHeight: enforced }}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
