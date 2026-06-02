"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const DISCORD_URL = "https://discord.gg/y8EbeMc9Mb";
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
      { href: "/pricing", label: "Upgrade" },
    ],
  },
] as const;

function DiscordFooterCard() {
  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="footer-discord-social"
      className="vodex-footer-discord-card group relative flex items-center gap-3 overflow-hidden rounded-xl border border-indigo-300/40 bg-gradient-to-r from-[#5865F2] via-[#5b6eea] to-[#7c3aed] px-4 py-3 shadow-md transition hover:shadow-lg"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-white/20 text-lg font-bold text-white ring-1 ring-white/30">
        D
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-white">Community</p>
        <p className="text-[11px] text-indigo-100/90">Join builders on Discord</p>
      </div>
      <span className="text-[11px] font-semibold text-white/90 group-hover:underline">Join →</span>
    </a>
  );
}

export function VodexImportantLinksFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "vodex-important-links-footer relative mt-auto shrink-0 overflow-hidden border-t border-sky-200/60",
        "bg-gradient-to-br from-sky-50 via-white to-blue-50/90",
        className,
      )}
      data-testid="vodex-important-links-footer"
    >
      <div className="vodex-footer-bird-trail pointer-events-none absolute inset-0 overflow-hidden" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-[var(--page-padding-x)] py-10">
        <div className="mb-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700/80">
                  {col.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] font-medium text-slate-600 transition hover:text-sky-700 hover:underline"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-[12px] font-medium text-slate-600 transition hover:text-sky-700 hover:underline"
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
          <DiscordFooterCard />
        </div>
        <p className="text-center text-[11px] font-medium text-slate-500/90">
          © {new Date().getFullYear()} Vodex · Built for AI-native creators
        </p>
      </div>
    </footer>
  );
}
