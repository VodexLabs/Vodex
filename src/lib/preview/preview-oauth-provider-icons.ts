import "server-only";

import { siApple, siDiscord, siFacebook, siGithub, siGoogle } from "simple-icons";

function brandSvg(icon: { path: string; hex: string }, size = 20): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="oauth-icon" aria-hidden="true"><path fill="#${icon.hex}" d="${icon.path}"/></svg>`;
}

const MICROSOFT_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" class="oauth-icon" aria-hidden="true"><rect x="3" y="3" width="8.5" height="8.5" fill="#F25022"/><rect x="12.5" y="3" width="8.5" height="8.5" fill="#7FBA00"/><rect x="3" y="12.5" width="8.5" height="8.5" fill="#00A4EF"/><rect x="12.5" y="12.5" width="8.5" height="8.5" fill="#FFB900"/></svg>`;

const EMAIL_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" class="oauth-icon" aria-hidden="true" fill="none" stroke="#1e6bff" stroke-width="1.75"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;

/** Inline SVG for preview auth HTML (server-rendered, high quality). */
export function previewOAuthProviderIconHtml(provider: string): string {
  switch (provider.toLowerCase()) {
    case "google":
      return brandSvg(siGoogle);
    case "github":
      return brandSvg(siGithub);
    case "apple":
      return brandSvg(siApple);
    case "microsoft":
      return MICROSOFT_SVG;
    case "facebook":
      return brandSvg(siFacebook);
    case "discord":
      return brandSvg(siDiscord);
    case "email":
      return EMAIL_SVG;
    default:
      return "";
  }
}

export function previewOAuthProviderLabel(provider: string): string {
  const p = provider.toLowerCase();
  if (p === "google") return "Google";
  if (p === "github") return "GitHub";
  if (p === "apple") return "Apple";
  if (p === "microsoft") return "Microsoft";
  if (p === "facebook") return "Facebook";
  if (p === "discord") return "Discord";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
