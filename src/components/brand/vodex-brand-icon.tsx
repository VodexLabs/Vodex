import { cn } from "@/lib/utils";
import {
  BRAND_NAME,
  VODEX_BRAND_ICON_UI_SRC,
} from "@/lib/branding/brand-assets";

export type VodexBrandIconSize =
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

export type VodexBrandIconVariant =
  | VodexBrandIconSize
  | "xs"
  | "xl"
  | "header"
  | "landingDesktop"
  | "landingMobile"
  | "create"
  | "drawer"
  | "assistant";

const SIZE_PX: Record<VodexBrandIconSize, number> = {
  tiny: 24,
  sm: 28,
  md: 40,
  lg: 48,
  hero: 64,
  auth: 36,
  sidebar: 36,
  mobile: 34,
  collapsedSidebar: 36,
  assistantAvatar: 28,
  previewHero: 64,
};

const LEGACY_VARIANT_PX: Record<VodexBrandIconVariant, number> = {
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

function resolvePx(size?: number, variant?: VodexBrandIconVariant): number {
  if (typeof size === "number" && size > 0) return Math.round(size);
  if (variant) return LEGACY_VARIANT_PX[variant] ?? SIZE_PX.md;
  return SIZE_PX.md;
}

export type VodexBrandIconProps = {
  size?: VodexBrandIconSize | VodexBrandIconVariant | number;
  variant?: VodexBrandIconVariant;
  className?: string;
  alt?: string;
  priority?: boolean;
};

/** Canonical Vodex platform mark — transparent PNG only, no background tile. */
export function VodexBrandIcon({
  size,
  variant,
  className,
  alt = BRAND_NAME,
  priority = false,
}: VodexBrandIconProps) {
  const namedSize = typeof size === "string" ? (size as VodexBrandIconVariant) : undefined;
  const numericSize = typeof size === "number" ? size : undefined;
  const px = resolvePx(numericSize, namedSize ?? variant);

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center leading-none", className)}
      style={{ width: px, height: px }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={VODEX_BRAND_ICON_UI_SRC}
        alt={alt}
        width={px}
        height={px}
        className="block h-full w-full object-contain object-center"
        style={{ background: "transparent" }}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </span>
  );
}
