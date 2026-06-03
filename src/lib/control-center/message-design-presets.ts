export type BackgroundPresetId =
  | "clean_white"
  | "soft_blue_white"
  | "icy_aurora"
  | "glass_frost"
  | "violet_glow"
  | "sunset_promo"
  | "critical_red_pulse"
  | "success_green_shimmer"
  | "dark_premium"
  | "animated_stars"
  | "animated_aurora"
  | "animated_gradient_shimmer"
  | "animated_floating_particles";

export type EffectPresetId =
  | "none"
  | "subtle_stars"
  | "glow_pulse"
  | "floating_sparkles"
  | "soft_radial_beam"
  | "animated_shine"
  | "status_pulse"
  | "promo_confetti"
  | "frost_particles";

export type IconPresetId =
  | "welcome_sparkle"
  | "megaphone"
  | "warning_triangle"
  | "gift"
  | "rocket"
  | "credit_bolt"
  | "shield"
  | "workspace_users"
  | "template_heart"
  | "wrench_status"
  | "integration_plug"
  | "crown_pro"
  | "check_success";

export type MessageDesign = {
  backgroundPreset: BackgroundPresetId;
  effectPreset: EffectPresetId;
  iconPreset: IconPresetId;
  animatedIconEnabled: boolean;
  textColor: string;
  accentColor: string;
  outlineColor: string;
  buttonColor?: string;
};

export const DEFAULT_INBOX_DESIGN: MessageDesign = {
  backgroundPreset: "soft_blue_white",
  effectPreset: "glow_pulse",
  iconPreset: "welcome_sparkle",
  animatedIconEnabled: true,
  textColor: "#0f172a",
  accentColor: "#2563eb",
  outlineColor: "#bae6fd",
};

export const DEFAULT_BANNER_DESIGN: MessageDesign = {
  backgroundPreset: "critical_red_pulse",
  effectPreset: "status_pulse",
  iconPreset: "warning_triangle",
  animatedIconEnabled: false,
  textColor: "#ffffff",
  accentColor: "#ffffff",
  outlineColor: "transparent",
  buttonColor: "#ffffff",
};

export const BACKGROUND_PRESETS: Array<{ id: BackgroundPresetId; label: string; animated?: boolean }> = [
  { id: "clean_white", label: "Clean white" },
  { id: "soft_blue_white", label: "Soft blue-white" },
  { id: "icy_aurora", label: "Icy aurora" },
  { id: "glass_frost", label: "Glass frost" },
  { id: "violet_glow", label: "Violet glow" },
  { id: "sunset_promo", label: "Sunset promo" },
  { id: "critical_red_pulse", label: "Critical red pulse" },
  { id: "success_green_shimmer", label: "Success green shimmer" },
  { id: "dark_premium", label: "Dark premium" },
  { id: "animated_stars", label: "Animated stars", animated: true },
  { id: "animated_aurora", label: "Animated aurora", animated: true },
  { id: "animated_gradient_shimmer", label: "Animated gradient shimmer", animated: true },
  { id: "animated_floating_particles", label: "Animated floating particles", animated: true },
];

export const EFFECT_PRESETS: Array<{ id: EffectPresetId; label: string }> = [
  { id: "none", label: "None" },
  { id: "subtle_stars", label: "Subtle stars" },
  { id: "glow_pulse", label: "Glow pulse" },
  { id: "floating_sparkles", label: "Floating sparkles" },
  { id: "soft_radial_beam", label: "Soft radial beam" },
  { id: "animated_shine", label: "Animated shine" },
  { id: "status_pulse", label: "Status pulse" },
  { id: "promo_confetti", label: "Promo confetti" },
  { id: "frost_particles", label: "Frost particles" },
];

export const ICON_PRESETS: Array<{ id: IconPresetId; label: string; color: string }> = [
  { id: "welcome_sparkle", label: "Welcome sparkle", color: "#7c3aed" },
  { id: "megaphone", label: "Megaphone", color: "#2563eb" },
  { id: "warning_triangle", label: "Warning", color: "#dc2626" },
  { id: "gift", label: "Gift", color: "#db2777" },
  { id: "rocket", label: "Rocket", color: "#0ea5e9" },
  { id: "credit_bolt", label: "Credit bolt", color: "#f59e0b" },
  { id: "shield", label: "Shield", color: "#059669" },
  { id: "workspace_users", label: "Workspace users", color: "#6366f1" },
  { id: "template_heart", label: "Template heart", color: "#ec4899" },
  { id: "wrench_status", label: "Status / wrench", color: "#64748b" },
  { id: "integration_plug", label: "Integration plug", color: "#14b8a6" },
  { id: "crown_pro", label: "Crown / Pro", color: "#eab308" },
  { id: "check_success", label: "Check success", color: "#22c55e" },
];

export function backgroundClass(id: BackgroundPresetId): string {
  const map: Record<BackgroundPresetId, string> = {
    clean_white: "bg-white dark:bg-slate-950",
    soft_blue_white:
      "bg-gradient-to-br from-sky-50 via-white to-indigo-50/80 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/40",
    icy_aurora:
      "bg-gradient-to-br from-cyan-50/90 via-sky-50/70 to-violet-100/60 dark:from-cyan-950/30 dark:via-slate-900 dark:to-violet-950/30",
    glass_frost: "bg-white/70 backdrop-blur-md dark:bg-slate-900/70",
    violet_glow: "bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-fuchsia-500/15",
    sunset_promo: "bg-gradient-to-r from-orange-400/20 via-rose-400/15 to-violet-500/20",
    critical_red_pulse: "bg-gradient-to-r from-red-600 to-rose-500",
    success_green_shimmer: "bg-gradient-to-r from-emerald-500 to-teal-500",
    dark_premium: "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950",
    animated_stars: "vodex-bg-animated-stars bg-slate-950",
    animated_aurora: "vodex-bg-animated-aurora",
    animated_gradient_shimmer: "vodex-bg-animated-shimmer",
    animated_floating_particles: "vodex-bg-animated-particles bg-slate-950/90",
  };
  return map[id] ?? map.soft_blue_white;
}

export function effectOverlayClass(id: EffectPresetId): string | null {
  const map: Partial<Record<EffectPresetId, string>> = {
    subtle_stars: "vodex-effect-subtle-stars",
    glow_pulse: "vodex-effect-glow-pulse",
    floating_sparkles: "vodex-effect-floating-sparkles",
    soft_radial_beam: "vodex-effect-radial-beam",
    animated_shine: "vodex-effect-shine",
    status_pulse: "vodex-effect-status-pulse",
    promo_confetti: "vodex-effect-confetti",
    frost_particles: "vodex-effect-frost",
  };
  return map[id] ?? null;
}

export function isAnimatedBackground(id: BackgroundPresetId): boolean {
  return id.startsWith("animated_");
}
