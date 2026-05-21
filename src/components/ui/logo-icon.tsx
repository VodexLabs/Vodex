import { DreamOS86BrandIcon } from "@/components/brand/dreamos86-brand-icon";

/**
 * @deprecated Prefer `DreamOS86BrandIcon` or `DreamOS86BrandLockup` — kept for existing imports.
 * DreamOS86 platform logo only (not user or generated app icons).
 */
export function LogoIcon({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const px = Math.max(24, size);
  const variant =
    px >= 40 ? "auth" : px >= 34 ? "header" : px >= 30 ? "assistant" : undefined;
  return (
    <DreamOS86BrandIcon
      size={variant ? undefined : px}
      variant={variant}
      className={className}
    />
  );
}
