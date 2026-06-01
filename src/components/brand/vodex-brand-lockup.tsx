import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/branding/brand-assets";
import {
  VodexBrandIcon,
  type VodexBrandIconSize,
  type VodexBrandIconVariant,
} from "@/components/brand/vodex-brand-icon";

export type VodexBrandLockupVariant =
  | "header"
  | "landingDesktop"
  | "landingMobile"
  | "create"
  | "sidebar"
  | "sidebarCollapsed"
  | "drawer"
  | "footer"
  | "marketingFooter"
  | "auth";

const VARIANT_ICON: Record<VodexBrandLockupVariant, VodexBrandIconSize | VodexBrandIconVariant> = {
  header: "mobile",
  landingDesktop: "md",
  landingMobile: "mobile",
  create: "mobile",
  sidebar: "sidebar",
  sidebarCollapsed: "collapsedSidebar",
  drawer: "sidebar",
  footer: "sm",
  marketingFooter: "md",
  auth: "auth",
};

/** Tight gap so icon + wordmark read as one lockup */
const VARIANT_GAP: Record<VodexBrandLockupVariant, string> = {
  auth: "gap-2",
  header: "gap-2",
  landingDesktop: "gap-2.5",
  landingMobile: "gap-2",
  create: "gap-2",
  sidebar: "gap-2",
  sidebarCollapsed: "",
  drawer: "gap-2",
  footer: "gap-2",
  marketingFooter: "gap-2.5",
};

const VARIANT_TEXT: Record<VodexBrandLockupVariant, string> = {
  header: "text-[18px] font-bold leading-none",
  landingDesktop: "text-[19px] font-bold leading-none",
  landingMobile: "text-[18px] font-bold leading-none",
  create: "text-[18px] font-bold leading-none",
  sidebar: "text-[18px] font-bold leading-none tracking-[-0.02em]",
  sidebarCollapsed: "text-[18px] font-bold leading-none",
  drawer: "text-[18px] font-bold leading-none tracking-[-0.02em]",
  footer: "text-[15px] font-semibold leading-none",
  marketingFooter: "text-[19px] font-bold leading-none",
  auth: "text-[19px] font-bold leading-none",
};

export type VodexBrandLockupProps = {
  variant?: VodexBrandLockupVariant;
  gapClassName?: string;
  className?: string;
  href?: string | null;
  showText?: boolean;
  priority?: boolean;
  onClick?: () => void;
};

export function VodexBrandLockup({
  variant = "header",
  gapClassName,
  className,
  href = "/",
  showText = true,
  priority = false,
  onClick,
}: VodexBrandLockupProps) {
  const iconSize = VARIANT_ICON[variant];
  const inner = (
    <>
      <VodexBrandIcon size={iconSize} alt="" priority={priority} />
      {showText && variant !== "sidebarCollapsed" && (
        <span
          className={cn(
            "truncate text-foreground",
            VARIANT_TEXT[variant],
          )}
        >
          {BRAND_NAME}
        </span>
      )}
    </>
  );

  const rootClass = cn(
    "flex min-w-0 shrink-0 items-center",
    variant === "sidebarCollapsed" ? "justify-center" : "justify-start",
    gapClassName ?? VARIANT_GAP[variant],
    className,
  );

  if (href != null && href !== "") {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={rootClass}
        aria-label={`${BRAND_NAME} home`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={rootClass} onClick={onClick} role={onClick ? "button" : undefined}>
      {inner}
    </div>
  );
}
