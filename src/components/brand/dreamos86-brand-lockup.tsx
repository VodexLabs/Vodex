import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DreamOS86BrandIcon,
  type DreamOS86BrandIconSize,
  type DreamOS86BrandIconVariant,
} from "@/components/brand/dreamos86-brand-icon";

export type DreamOS86BrandLockupVariant =
  | "header"
  | "landingDesktop"
  | "landingMobile"
  | "create"
  | "sidebar"
  | "sidebarCollapsed"
  | "drawer"
  | "footer"
  | "auth";

const VARIANT_ICON: Record<DreamOS86BrandLockupVariant, DreamOS86BrandIconSize | DreamOS86BrandIconVariant> = {
  header: "mobile",
  landingDesktop: "md",
  landingMobile: "mobile",
  create: "md",
  sidebar: "sidebar",
  sidebarCollapsed: "collapsedSidebar",
  drawer: "sidebar",
  footer: "sm",
  auth: "auth",
};

const VARIANT_GAP: Record<DreamOS86BrandLockupVariant, string> = {
  auth: "gap-1.5",
  header: "gap-1.5",
  landingDesktop: "gap-1.5",
  landingMobile: "gap-1.5",
  create: "gap-1.5",
  sidebar: "gap-1.5",
  sidebarCollapsed: "",
  drawer: "gap-1.5",
  footer: "gap-2",
};

const VARIANT_TEXT: Record<DreamOS86BrandLockupVariant, string> = {
  header: "text-[13px] sm:text-[14px] font-bold",
  landingDesktop: "text-[14px] sm:text-[15px] font-bold",
  landingMobile: "text-[14px] font-bold",
  create: "text-[14px] font-bold",
  sidebar: "text-[13.5px] font-bold",
  sidebarCollapsed: "text-[13.5px] font-bold",
  drawer: "text-[14px] font-bold",
  footer: "text-[13px] font-semibold",
  auth: "text-[17px] sm:text-[18px] font-bold",
};

export type DreamOS86BrandLockupProps = {
  variant?: DreamOS86BrandLockupVariant;
  gapClassName?: string;
  className?: string;
  href?: string;
  showText?: boolean;
  priority?: boolean;
  onClick?: () => void;
};

/**
 * DreamOS86 platform mark: transparent cloud + wordmark. Not for user/project icons.
 */
export function DreamOS86BrandLockup({
  variant = "header",
  gapClassName,
  className,
  href = "/",
  showText = true,
  priority = false,
  onClick,
}: DreamOS86BrandLockupProps) {
  const iconSize = VARIANT_ICON[variant];
  const inner = (
    <>
      <DreamOS86BrandIcon size={iconSize} alt="" priority={priority} />
      {showText && variant !== "sidebarCollapsed" && (
        <span
          className={cn(
            "truncate tracking-[-0.03em] text-foreground leading-none",
            VARIANT_TEXT[variant],
          )}
        >
          DreamOS86
        </span>
      )}
    </>
  );

  const rootClass = cn(
    "flex min-w-0 shrink items-center",
    variant === "sidebarCollapsed" ? "justify-center" : "items-center",
    gapClassName ?? VARIANT_GAP[variant],
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={rootClass}
        aria-label="DreamOS86 home"
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
