"use client";

import * as React from "react";
import { siApple, siDiscord, siFacebook, siGithub, siGoogle } from "simple-icons";
import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

function BrandSvg({ icon, className }: { icon: { path: string; hex: string }; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5 shrink-0", className)} aria-hidden>
      <path fill={`#${icon.hex}`} d={icon.path} />
    </svg>
  );
}

export type AuthProviderId =
  | "email"
  | "google"
  | "github"
  | "apple"
  | "microsoft"
  | "discord"
  | "facebook"
  | "phone"
  | "custom";

export function AuthProviderIcon({
  provider,
  className,
}: {
  provider: AuthProviderId | string;
  className?: string;
}) {
  switch (provider) {
    case "email":
      return <Mail className={cn("size-5 text-accent", className)} strokeWidth={1.75} />;
    case "phone":
      return <Phone className={cn("size-5 text-accent", className)} strokeWidth={1.75} />;
    case "google":
    case "google-custom":
      return <BrandSvg icon={siGoogle} className={className} />;
    case "github":
      return <BrandSvg icon={siGithub} className={className} />;
    case "apple":
      return <BrandSvg icon={siApple} className={className} />;
    case "microsoft":
      return (
        <svg viewBox="0 0 24 24" className={cn("size-5 shrink-0", className)} aria-hidden>
          <rect x="3" y="3" width="8.5" height="8.5" fill="#F25022" />
          <rect x="12.5" y="3" width="8.5" height="8.5" fill="#7FBA00" />
          <rect x="3" y="12.5" width="8.5" height="8.5" fill="#00A4EF" />
          <rect x="12.5" y="12.5" width="8.5" height="8.5" fill="#FFB900" />
        </svg>
      );
    case "discord":
      return <BrandSvg icon={siDiscord} className={className} />;
    case "facebook":
      return <BrandSvg icon={siFacebook} className={className} />;
    default:
      return (
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-md bg-accent/15 text-[9px] font-bold text-accent",
            className,
          )}
        >
          ?
        </span>
      );
  }
}
