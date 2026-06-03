"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { PremiumDiscordCard } from "@/components/ui/premium-discord-card";
import { FooterIcedBirds } from "@/components/layout/footer-iced-birds";

const STATUS_URL = "https://status.vodex.dev";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Home" },
      { href: "/projects", label: "Apps" },
      { href: "/templates", label: "Templates" },
      { href: "/explore", label: "Explore" },
      { href: "/marketplace", label: "Marketplace" },
      { href: "/deploy", label: "Deploy" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/help", label: "Help" },
      { href: "/changelog", label: "Changelog" },
      { href: STATUS_URL, label: "Status", external: true },
      { href: "https://discord.gg/y8EbeMc9Mb", label: "Discord Community", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/refunds", label: "Refund Policy" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Billing",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/settings/billing", label: "Billing" },
    ],
  },
] as const;

export function VodexImportantLinksFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "vodex-important-links-footer relative mt-auto shrink-0 overflow-hidden border-t border-sky-300/40 dark:border-cyan-500/30",
        className,
      )}
      data-testid="vodex-important-links-footer"
    >
      <div className="vodex-footer-depth-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="vodex-footer-particles pointer-events-none absolute inset-0" aria-hidden />
      <div className="vodex-footer-snow-crystals pointer-events-none absolute inset-0" aria-hidden />
      <div className="vodex-footer-ambient pointer-events-none absolute inset-0" aria-hidden />
      <FooterIcedBirds />
      <div className="vodex-footer-glass relative z-[2] mx-auto max-w-6xl px-[var(--page-padding-x)] py-5 sm:py-6">
        <div className="mb-4 grid gap-5 lg:grid-cols-[1fr_minmax(220px,260px)] lg:items-center lg:gap-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="vodex-footer-title-glow text-[11px] font-extrabold uppercase tracking-[0.2em] text-sky-800 dark:text-cyan-200">
                  {col.title}
                </p>
                <ul className="mt-2.5 space-y-2">
                  {col.links.map((link) => (
                    <li key={`${col.title}-${link.label}`}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12.5px] font-semibold text-slate-700/95 transition hover:text-sky-800 hover:underline dark:text-slate-300/95 dark:hover:text-cyan-200"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-[12.5px] font-semibold text-slate-700/95 transition hover:text-sky-800 hover:underline dark:text-slate-300/95 dark:hover:text-cyan-200"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <PremiumDiscordCard
            variant="footer"
            testId="footer-discord-social"
            className="vodex-discord-card-icy--footer max-lg:max-w-md"
          />
        </div>
        <p className="text-center text-[11px] font-semibold tracking-wide text-slate-600/90 dark:text-slate-400/95">
          © {new Date().getFullYear()} Vodex · Built for AI-native creators
        </p>
      </div>
    </footer>
  );
}
