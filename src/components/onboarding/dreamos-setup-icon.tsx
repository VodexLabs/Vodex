import { VodexBrandIcon } from "@/components/brand/vodex-brand-icon";

/** Vodex platform mark for onboarding (not user/project app icons). */
export function DreamOsSetupIcon({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <VodexBrandIcon
      size={size >= 30 ? size : undefined}
      variant={size < 30 ? "assistant" : undefined}
      className={className}
      alt="Vodex"
    />
  );
}
