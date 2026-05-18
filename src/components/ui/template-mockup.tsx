"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Renders a mini "app screenshot" mockup for a template card banner.
 * Each category gets a simplified but recognizable UI layout.
 */

type MockupVariant =
  | "saas"
  | "ai"
  | "dashboard"
  | "mobile"
  | "ecommerce"
  | "social"
  | "portfolio"
  | "crm"
  | "finance"
  | "productivity"
  | "community"
  | "enterprise"
  | "default";

interface TemplateMockupProps {
  variant: MockupVariant;
  gradient: string;
  className?: string;
}

// ─── Individual mockup renderers ──────────────────────────────────────────────

function SaaSMockup() {
  return (
    <svg viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Sidebar */}
      <rect x="0" y="0" width="56" height="160" fill="rgba(0,0,0,0.18)" />
      <rect x="10" y="16" width="36" height="5" rx="2.5" fill="rgba(255,255,255,0.5)" />
      {[32, 46, 60, 74, 88, 102].map((y, i) => (
        <g key={i}>
          <rect x="10" y={y} width="12" height="12" rx="3" fill={i === 0 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)"} />
          <rect x="26" y={y + 1} width="22" height="4" rx="2" fill="rgba(255,255,255,0.22)" />
          <rect x="26" y={y + 7} width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
        </g>
      ))}
      {/* Main area */}
      {/* Topbar */}
      <rect x="56" y="0" width="244" height="24" fill="rgba(0,0,0,0.1)" />
      <rect x="64" y="8" width="60" height="8" rx="3" fill="rgba(255,255,255,0.3)" />
      <rect x="238" y="7" width="24" height="10" rx="5" fill="rgba(255,255,255,0.35)" />
      <rect x="264" y="7" width="24" height="10" rx="5" fill="rgba(255,255,255,0.25)" />
      {/* Stats cards */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={64 + i * 56} y="32" width="48" height="34" rx="6" fill="rgba(255,255,255,0.15)" />
          <rect x={70 + i * 56} y="38" width="20" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
          <rect x={70 + i * 56} y="46" width="32" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
          <rect x={70 + i * 56} y="57" width="14" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
        </g>
      ))}
      {/* Chart */}
      <rect x="64" y="74" width="150" height="76" rx="6" fill="rgba(255,255,255,0.1)" />
      <rect x="72" y="80" width="50" height="5" rx="2" fill="rgba(255,255,255,0.4)" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const h = [30, 45, 28, 52, 38, 60, 42, 35][i];
        return (
          <rect key={i} x={72 + i * 17} y={138 - h} width="10" height={h} rx="3" fill={`rgba(255,255,255,${0.2 + i * 0.04})`} />
        );
      })}
      {/* Right panel */}
      <rect x="222" y="74" width="78" height="76" rx="6" fill="rgba(255,255,255,0.1)" />
      <rect x="230" y="80" width="40" height="5" rx="2" fill="rgba(255,255,255,0.4)" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="230" y={92 + i * 14} width="16" height="8" rx="3" fill="rgba(255,255,255,0.25)" />
          <rect x="250" y={94 + i * 14} width="40" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
          <rect x="250" y={99 + i * 14} width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.15)" />
        </g>
      ))}
    </svg>
  );
}

function AIMockup() {
  return (
    <svg viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Chat area */}
      <rect x="0" y="0" width="300" height="160" fill="rgba(0,0,0,0.05)" />
      {/* Top bar */}
      <rect x="0" y="0" width="300" height="28" fill="rgba(0,0,0,0.12)" />
      <circle cx="14" cy="14" r="8" fill="rgba(255,255,255,0.25)" />
      <rect x="26" y="10" width="50" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
      <rect x="26" y="16" width="30" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
      {/* Messages */}
      {/* AI message 1 */}
      <rect x="8" y="36" width="170" height="28" rx="10" fill="rgba(255,255,255,0.2)" />
      <rect x="16" y="42" width="110" height="4" rx="2" fill="rgba(255,255,255,0.55)" />
      <rect x="16" y="50" width="78" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
      {/* User message */}
      <rect x="100" y="72" width="140" height="22" rx="10" fill="rgba(255,255,255,0.3)" />
      <rect x="110" y="78" width="80" height="4" rx="2" fill="rgba(255,255,255,0.6)" />
      <rect x="110" y="85" width="50" height="3" rx="1.5" fill="rgba(255,255,255,0.4)" />
      {/* AI message 2 */}
      <rect x="8" y="102" width="190" height="32" rx="10" fill="rgba(255,255,255,0.2)" />
      <rect x="16" y="108" width="130" height="4" rx="2" fill="rgba(255,255,255,0.55)" />
      <rect x="16" y="116" width="100" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
      <rect x="16" y="124" width="60" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
      {/* Input box */}
      <rect x="8" y="140" width="284" height="14" rx="7" fill="rgba(255,255,255,0.18)" />
      <rect x="16" y="145" width="80" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
      <rect x="278" y="140" width="14" height="14" rx="7" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

function DashboardMockup() {
  return (
    <svg viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Top bar */}
      <rect x="0" y="0" width="300" height="22" fill="rgba(0,0,0,0.12)" />
      <rect x="8" y="7" width="50" height="8" rx="3" fill="rgba(255,255,255,0.4)" />
      <rect x="240" y="7" width="52" height="8" rx="3" fill="rgba(255,255,255,0.2)" />
      {/* KPI row */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={8 + i * 96} y="30" width="88" height="38" rx="6" fill="rgba(255,255,255,0.14)" />
          <rect x={16 + i * 96} y="37" width="30" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
          <rect x={16 + i * 96} y="45" width="52" height="10" rx="3" fill="rgba(255,255,255,0.5)" />
          <rect x={16 + i * 96} y="57" width="20" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
        </g>
      ))}
      {/* Area chart */}
      <rect x="8" y="76" width="186" height="76" rx="6" fill="rgba(255,255,255,0.1)" />
      <polyline
        points="16,138 36,118 56,128 76,100 96,108 116,88 136,96 156,76 176,84 186,90"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2"
      />
      <polygon
        points="16,138 36,118 56,128 76,100 96,108 116,88 136,96 156,76 176,84 186,90 186,150 16,150"
        fill="rgba(255,255,255,0.08)"
      />
      {/* Right panel: pie/donut hint + list */}
      <rect x="202" y="76" width="90" height="76" rx="6" fill="rgba(255,255,255,0.1)" />
      <circle cx="247" cy="110" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
      <circle cx="247" cy="110" r="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="4" strokeDasharray="40 100" strokeLinecap="round" />
      <circle cx="247" cy="110" r="22" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeDasharray="25 100" strokeDashoffset="-40" strokeLinecap="round" />
    </svg>
  );
}

function MobileMockup() {
  return (
    <svg viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Phone frame left */}
      <rect x="50" y="4" width="80" height="152" rx="12" fill="rgba(0,0,0,0.2)" />
      <rect x="54" y="8" width="72" height="144" rx="10" fill="rgba(0,0,0,0.12)" />
      <rect x="76" y="10" width="28" height="5" rx="2.5" fill="rgba(0,0,0,0.3)" />
      {/* Phone content */}
      <rect x="58" y="20" width="64" height="40" rx="4" fill="rgba(255,255,255,0.15)" />
      <rect x="62" y="26" width="40" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
      <rect x="62" y="34" width="28" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
      <rect x="62" y="42" width="48" height="12" rx="4" fill="rgba(255,255,255,0.3)" />
      <rect x="58" y="66" width="30" height="30" rx="4" fill="rgba(255,255,255,0.15)" />
      <rect x="92" y="66" width="30" height="30" rx="4" fill="rgba(255,255,255,0.15)" />
      <rect x="62" y="72" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="62" y="78" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
      <rect x="96" y="72" width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="96" y="78" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
      {/* Bottom nav */}
      <rect x="54" y="136" width="72" height="16" rx="6" fill="rgba(0,0,0,0.15)" />
      {[64, 78, 92, 106].map((x) => (
        <circle key={x} cx={x} cy="144" r="4" fill="rgba(255,255,255,0.3)" />
      ))}
      {/* Second phone (offset) */}
      <rect x="168" y="12" width="76" height="140" rx="11" fill="rgba(0,0,0,0.15)" />
      <rect x="172" y="16" width="68" height="132" rx="9" fill="rgba(0,0,0,0.08)" />
      <rect x="190" y="18" width="26" height="4" rx="2" fill="rgba(0,0,0,0.2)" />
      <rect x="176" y="28" width="60" height="35" rx="6" fill="rgba(255,255,255,0.12)" />
      <rect x="180" y="34" width="36" height="6" rx="2" fill="rgba(255,255,255,0.45)" />
      <rect x="180" y="42" width="22" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
      <rect x="180" y="48" width="44" height="10" rx="4" fill="rgba(255,255,255,0.28)" />
      {[70, 90].map((y, i) => (
        <rect key={i} x="176" y={y} width="60" height="16" rx="4" fill="rgba(255,255,255,0.1)" />
      ))}
    </svg>
  );
}

function EcommerceMockup() {
  return (
    <svg viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Nav */}
      <rect x="0" y="0" width="300" height="22" fill="rgba(0,0,0,0.12)" />
      <rect x="10" y="7" width="40" height="8" rx="3" fill="rgba(255,255,255,0.4)" />
      <rect x="100" y="8" width="100" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
      <rect x="270" y="7" width="22" height="8" rx="3" fill="rgba(255,255,255,0.25)" />
      {/* Product grid */}
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 10 + (i % 3) * 96;
        const y = 30 + Math.floor(i / 3) * 80;
        if (i > 2) return null;
        return (
          <g key={i}>
            <rect x={x} y={y} width="86" height="120" rx="6" fill="rgba(255,255,255,0.12)" />
            <rect x={x} y={y} width="86" height="60" rx="6" fill="rgba(255,255,255,0.18)" />
            <rect x={x + 8} y={y + 70} width="48" height="5" rx="2" fill="rgba(255,255,255,0.45)" />
            <rect x={x + 8} y={y + 78} width="30" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
            <rect x={x + 8} y={y + 86} width="60" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
            <rect x={x + 8} y={y + 96} width="70" height="16" rx="4" fill="rgba(255,255,255,0.3)" />
          </g>
        );
      })}
      {/* Right panel: cart */}
      <rect x="204" y="30" width="88" height="122" rx="6" fill="rgba(0,0,0,0.12)" />
      <rect x="212" y="36" width="50" height="5" rx="2" fill="rgba(255,255,255,0.4)" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="212" y={48 + i * 26} width="20" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
          <rect x="236" y={50 + i * 26} width="40" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
          <rect x="236" y={57 + i * 26} width="22" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
        </g>
      ))}
      <rect x="212" y="130" width="72" height="16" rx="5" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

function SocialMockup() {
  return (
    <svg viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Story bar */}
      <rect x="0" y="0" width="300" height="22" fill="rgba(0,0,0,0.12)" />
      <rect x="8" y="4" width="40" height="14" rx="6" fill="rgba(255,255,255,0.3)" />
      {[58, 106, 154, 202, 250].map((x) => (
        <circle key={x} cx={x} cy="11" r="10" fill="rgba(255,255,255,0.18)" />
      ))}
      {/* Posts */}
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x="8" y={28 + i * 64} width="164" height="56" rx="6" fill="rgba(255,255,255,0.12)" />
          <circle cx="22" cy={38 + i * 64} r="8" fill="rgba(255,255,255,0.3)" />
          <rect x="36" y={34 + i * 64} width="60" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
          <rect x="36" y={41 + i * 64} width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
          <rect x="14" y={52 + i * 64} width="100" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
          <rect x="14" y={60 + i * 64} width="80" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
          {/* Like/comment */}
          <rect x="14" y={72 + i * 64} width="30" height="8" rx="3" fill="rgba(255,255,255,0.15)" />
          <rect x="50" y={72 + i * 64} width="30" height="8" rx="3" fill="rgba(255,255,255,0.15)" />
        </g>
      ))}
      {/* Right: trending / suggestions */}
      <rect x="180" y="28" width="112" height="124" rx="6" fill="rgba(0,0,0,0.1)" />
      <rect x="188" y="34" width="50" height="5" rx="2" fill="rgba(255,255,255,0.4)" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx="196" cy={48 + i * 22} r="8" fill="rgba(255,255,255,0.2)" />
          <rect x="208" y={44 + i * 22} width="60" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
          <rect x="208" y={51 + i * 22} width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
        </g>
      ))}
    </svg>
  );
}

function PortfolioMockup() {
  return (
    <svg viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Nav */}
      <rect x="0" y="0" width="300" height="22" fill="rgba(0,0,0,0.08)" />
      <rect x="10" y="7" width="40" height="8" rx="3" fill="rgba(255,255,255,0.5)" />
      {[120, 155, 190, 225].map((x) => (
        <rect key={x} x={x} y="9" width="28" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
      ))}
      {/* Hero section */}
      <rect x="0" y="22" width="300" height="80" fill="rgba(0,0,0,0.06)" />
      <rect x="16" y="34" width="120" height="14" rx="4" fill="rgba(255,255,255,0.6)" />
      <rect x="16" y="52" width="90" height="8" rx="3" fill="rgba(255,255,255,0.35)" />
      <rect x="16" y="64" width="70" height="8" rx="3" fill="rgba(255,255,255,0.25)" />
      <rect x="16" y="78" width="80" height="18" rx="6" fill="rgba(255,255,255,0.35)" />
      <rect x="168" y="28" width="120" height="68" rx="8" fill="rgba(255,255,255,0.15)" />
      {/* Project cards */}
      <rect x="8" y="110" width="88" height="44" rx="6" fill="rgba(255,255,255,0.15)" />
      <rect x="104" y="110" width="88" height="44" rx="6" fill="rgba(255,255,255,0.15)" />
      <rect x="200" y="110" width="88" height="44" rx="6" fill="rgba(255,255,255,0.15)" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={16 + i * 96} y="118" width="50" height="5" rx="2" fill="rgba(255,255,255,0.4)" />
          <rect x={16 + i * 96} y="127" width="34" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
          <rect x={16 + i * 96} y="137" width="60" height="10" rx="3" fill="rgba(255,255,255,0.18)" />
        </g>
      ))}
    </svg>
  );
}

function CRMMockup() {
  return (
    <svg viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Sidebar */}
      <rect x="0" y="0" width="52" height="160" fill="rgba(0,0,0,0.18)" />
      <rect x="8" y="10" width="36" height="6" rx="3" fill="rgba(255,255,255,0.4)" />
      {[28, 42, 56, 70, 84, 98].map((y) => (
        <rect key={y} x="10" y={y} width="32" height="10" rx="4" fill="rgba(255,255,255,0.15)" />
      ))}
      {/* Pipeline columns */}
      {["Lead", "Qual.", "Prop.", "Won"].map((_, col) => (
        <g key={col}>
          <rect x={60 + col * 60} y="10" width="52" height="10" rx="3" fill="rgba(255,255,255,0.2)" />
          {[0, 1, 2, 3].slice(0, 3 - (col % 2)).map((row) => (
            <rect key={row} x={60 + col * 60} y={26 + row * 36} width="52" height="30" rx="5" fill="rgba(255,255,255,0.12)" />
          ))}
        </g>
      ))}
      {/* Contact minicard */}
      <rect x="0" y="130" width="300" height="30" fill="rgba(0,0,0,0.08)" />
      <rect x="8" y="138" width="16" height="16" rx="8" fill="rgba(255,255,255,0.3)" />
      <rect x="28" y="140" width="60" height="4" rx="2" fill="rgba(255,255,255,0.4)" />
      <rect x="28" y="147" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}

function DefaultMockup({ gradient }: { gradient: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="space-y-2 text-center opacity-60">
        <div className="w-16 h-3 bg-white/40 rounded mx-auto" />
        <div className="w-24 h-2 bg-white/25 rounded mx-auto" />
        <div className="w-12 h-2 bg-white/20 rounded mx-auto" />
      </div>
    </div>
  );
}

// ─── Variant resolver ─────────────────────────────────────────────────────────

const VARIANT_COMPONENTS: Record<MockupVariant, React.FC<any>> = {
  saas: SaaSMockup,
  ai: AIMockup,
  dashboard: DashboardMockup,
  mobile: MobileMockup,
  ecommerce: EcommerceMockup,
  social: SocialMockup,
  portfolio: PortfolioMockup,
  crm: CRMMockup,
  finance: DashboardMockup,
  productivity: SaaSMockup,
  community: SocialMockup,
  enterprise: SaaSMockup,
  default: DefaultMockup,
};

export function categoryToVariant(category: string): MockupVariant {
  const map: Record<string, MockupVariant> = {
    saas: "saas",
    "saas-starter": "saas",
    "saas-dashboard": "saas",
    ai: "ai",
    "ai-chat": "ai",
    "ai-dashboard": "dashboard",
    "ai-dashboard-starter": "dashboard",
    dashboard: "dashboard",
    analytics: "dashboard",
    mobile: "mobile",
    "mobile-app-starter": "mobile",
    ecommerce: "ecommerce",
    "e-commerce": "ecommerce",
    social: "social",
    portfolio: "portfolio",
    crm: "crm",
    finance: "finance",
    productivity: "productivity",
    community: "community",
    enterprise: "enterprise",
  };
  return map[category.toLowerCase()] ?? "default";
}

export function TemplateMockup({ variant, gradient, className }: TemplateMockupProps) {
  const MockupComponent = VARIANT_COMPONENTS[variant] ?? DefaultMockup;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, var(--gradient-from, rgba(0,0,0,0.1)), var(--gradient-to, rgba(0,0,0,0.05)))` }}
    >
      {/* Gradient background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
      {/* Light overlay for better SVG contrast */}
      <div className="absolute inset-0 bg-white/5" />
      {/* SVG mockup */}
      <div className="relative h-full w-full">
        <MockupComponent gradient={gradient} />
      </div>
      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/20 to-transparent" />
    </div>
  );
}
