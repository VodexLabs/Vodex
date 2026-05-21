import { DreamOS86BrandIcon } from "@/components/brand/dreamos86-brand-icon";

/** DreamOS86 platform mark for onboarding (not user/project app icons). */
export function DreamOsSetupIcon({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <DreamOS86BrandIcon
      size={size >= 30 ? size : undefined}
      variant={size < 30 ? "assistant" : undefined}
      className={className}
      alt="DreamOS86"
    />
  );
}
