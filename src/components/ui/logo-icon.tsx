import { VodexBrandIcon } from "@/components/brand/vodex-brand-icon";

/**
 * @deprecated Prefer `VodexBrandIcon` or `VodexBrandLockup` — kept for existing imports.
 * Vodex platform logo only (not user or generated app icons).
 */
export function LogoIcon({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <VodexBrandIcon
      size={size}
      className={className}
    />
  );
}
