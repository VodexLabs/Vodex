"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, X, ChevronDown, ChevronUp, Zap, Sparkles,
  Building2, ArrowRight, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { variants } from "@/lib/motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_CREDITS = 100;
const ANNUAL_DISCOUNT = 0.20;
const INFINITY_DISCOUNT = 0.05;

// ─── Infinity tiers ───────────────────────────────────────────────────────────

interface InfinityTier {
  id: string;
  label: string;
  credits: number;
  baseMonthly: number;   // non-discounted monthly price
  discount?: number;     // 0.05 for 5% off
}

const INFINITY_TIERS: InfinityTier[] = [
  { id: "inf-1", label: "Infinity I",   credits: 5_000,  baseMonthly: 100 },
  { id: "inf-2", label: "Infinity II",  credits: 10_000, baseMonthly: 200 },
  { id: "inf-3", label: "Infinity III", credits: 15_000, baseMonthly: 300 },
  { id: "inf-4", label: "Infinity IV",  credits: 20_000, baseMonthly: 400, discount: INFINITY_DISCOUNT },
  { id: "inf-5", label: "Infinity V",   credits: 30_000, baseMonthly: 600, discount: INFINITY_DISCOUNT },
  { id: "inf-6", label: "Infinity VI",  credits: 45_000, baseMonthly: 900, discount: INFINITY_DISCOUNT },
  { id: "inf-7", label: "Infinity VII", credits: 65_000, baseMonthly: 1300, discount: INFINITY_DISCOUNT },
];

function tierPrice(tier: InfinityTier, annual: boolean): number {
  const base = tier.discount ? Math.round(tier.baseMonthly * (1 - tier.discount)) : tier.baseMonthly;
  if (annual) return Math.round(base * (1 - ANNUAL_DISCOUNT));
  return base;
}

function tierOriginalPrice(tier: InfinityTier): number {
  return tier.baseMonthly;
}

// ─── Comparison table data ────────────────────────────────────────────────────

const COMPARISON_ROWS: { label: string; free: string | boolean; starter: string | boolean; pro: string | boolean; infinity: string | boolean }[] = [
  { label: "Monthly credits",      free: "100",       starter: "1,000",    pro: "2,500",         infinity: "5,000–65,000" },
  { label: "Active projects",      free: "3",         starter: "Unlimited", pro: "Unlimited",    infinity: "Unlimited" },
  { label: "Discuss mode",         free: true,        starter: true,        pro: true,           infinity: true },
  { label: "Edit mode",            free: false,       starter: true,        pro: true,           infinity: true },
  { label: "Build mode",           free: false,       starter: true,        pro: true,           infinity: true },
  { label: "Manual model select",  free: false,       starter: true,        pro: true,           infinity: true },
  { label: "Frontier models",      free: false,       starter: "Standard",  pro: "All",          infinity: "All" },
  { label: "Custom domains",       free: false,       starter: true,        pro: "Unlimited",    infinity: "Unlimited" },
  { label: "Remove watermark",     free: false,       starter: true,        pro: true,           infinity: true },
  { label: "Source export",        free: false,       starter: true,        pro: true,           infinity: true },
  { label: "Team collaborators",   free: false,       starter: false,       pro: "5",            infinity: "Custom" },
  { label: "Analytics",            free: false,       starter: false,       pro: true,           infinity: true },
  { label: "API access",           free: false,       starter: false,       pro: true,           infinity: true },
  { label: "Dedicated compute",    free: false,       starter: false,       pro: false,          infinity: true },
  { label: "White-label",          free: false,       starter: false,       pro: false,          infinity: true },
  { label: "SSO / SAML",          free: false,       starter: false,       pro: false,          infinity: true },
  { label: "Support",             free: "Community", starter: "Email",     pro: "Priority",      infinity: "Dedicated" },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "What are credits?",
    a: "Credits are the unit of AI compute used for every generation, edit, or build action. Each AI model request consumes a small number of credits based on the model selected and task complexity. Discuss mode is the most credit-efficient, while Build mode with frontier models uses more.",
  },
  {
    q: "Do credits roll over to next month?",
    a: "Credits reset at the start of each billing period. Unused credits do not carry forward. If you need more capacity, you can upgrade to a higher plan or contact us for a custom arrangement.",
  },
  {
    q: "Can I change my plan at any time?",
    a: "Yes. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, with prorated billing for the rest of your period. Downgrades apply at the next renewal.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "When you use all your monthly credits, new generation requests will be paused until your credits reset at the start of the next period. You can upgrade your plan at any time to continue immediately.",
  },
  {
    q: "How does annual billing work?",
    a: "Annual plans are billed once per year at a 20% discount compared to the equivalent monthly plan. Credits remain exactly the same — you get the same monthly allowance, just at a lower per-month cost.",
  },
  {
    q: "What is Infinity?",
    a: "Infinity is our enterprise-tier product for teams and power users who need high monthly credit volumes, all frontier models, dedicated infrastructure, concurrency, white-labeling, SSO, and a dedicated support tier. You pick a tier (I–VII) based on your monthly credit needs.",
  },
  {
    q: "Can I get a custom plan?",
    a: "Yes. If your team's needs exceed Infinity VII or you need special compliance, custom SLAs, or bespoke infrastructure, contact us and we'll design a plan around your requirements.",
  },
  {
    q: "Do paid plans remove the DreamOS86 watermark?",
    a: "Yes. All paid plans (Starter and above) remove the DreamOS86 branding from your deployed apps. The Free plan shows a subtle 'Built with DreamOS86' badge.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. You can cancel your subscription at any time. Your plan stays active until the end of the current billing period, then reverts to Free. No lock-ins, no cancellation fees.",
  },
];

// ─── Cell helper ──────────────────────────────────────────────────────────────

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto size-4 text-positive" strokeWidth={2.5} />;
  if (value === false) return <X className="mx-auto size-3.5 text-muted-foreground/30" strokeWidth={2} />;
  return <span className="text-[12px] text-muted-foreground">{value}</span>;
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-1 py-4 text-left text-[14px] font-medium text-foreground hover:text-accent transition-colors"
      >
        {q}
        {open ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="px-1 pb-4 text-[13.5px] leading-relaxed text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  id: string;
  name: string;
  price: number | null;
  annualPrice?: number | null;
  annual: boolean;
  credits: string;
  tagline: string;
  features: string[];
  notIncluded?: string[];
  highlight?: boolean;
  badge?: string;
  cta: string;
  currentPlanId?: string | null;
  children?: React.ReactNode;
}

function PlanCard({
  id, name, price, annualPrice, annual, credits, tagline, features, notIncluded = [],
  highlight, badge, cta, currentPlanId, children,
}: PlanCardProps) {
  const isCurrent = currentPlanId === id;
  const displayPrice = annual && annualPrice != null ? annualPrice : price;
  const originalPrice = annual && annualPrice != null ? price : null;

  return (
    <motion.div
      variants={variants.fadeUp}
      className={cn(
        "relative flex flex-col rounded-[var(--radius-xl)] ring-1 overflow-hidden",
        highlight
          ? "bg-gradient-to-b from-accent/8 via-background to-background ring-accent/40 shadow-[0_0_0_1px_hsl(var(--accent)/0.15),0_12px_40px_-8px_hsl(var(--accent)/0.25)]"
          : "bg-background ring-border",
      )}
    >
      {highlight && (
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent to-transparent" />
      )}
      {badge && (
        <div className="absolute right-4 top-4">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {badge}
          </span>
        </div>
      )}
      <div className="flex flex-col gap-4 p-6">
        {/* Header */}
        <div>
          <p className="text-[13px] font-semibold text-muted-foreground">{name}</p>
          <div className="mt-1 flex items-end gap-1.5">
            {price === 0 ? (
              <span className="text-[32px] font-bold tracking-tight text-foreground leading-none">Free</span>
            ) : price === null ? (
              <span className="text-[24px] font-bold tracking-tight text-foreground leading-none">Custom</span>
            ) : (
              <>
                <span className="text-[32px] font-bold tracking-tight text-foreground leading-none">
                  ${displayPrice}
                </span>
                {originalPrice !== null && originalPrice !== displayPrice && (
                  <span className="text-[13px] text-muted-foreground/50 line-through leading-loose">
                    ${originalPrice}
                  </span>
                )}
                <span className="text-[12px] text-muted-foreground pb-1">/mo</span>
              </>
            )}
          </div>
          {annual && price !== null && price !== 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Billed annually ({20}% off)
            </p>
          )}
          <p className="mt-2 text-[11.5px] text-muted-foreground leading-snug">{tagline}</p>
        </div>

        {/* Credits pill */}
        <div className="flex items-center gap-2 rounded-xl bg-accent/8 px-3 py-2 ring-1 ring-accent/15">
          <Zap className="size-3.5 shrink-0 text-accent" strokeWidth={2} />
          <span className="text-[12px] font-semibold text-accent">{credits}</span>
        </div>

        {/* Children (Infinity dropdown) */}
        {children}

        {/* CTA */}
        <Link
          href={id === "free" ? "/auth/sign-up" : "/pricing#contact"}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition",
            isCurrent
              ? "bg-surface text-muted-foreground ring-1 ring-border cursor-default"
              : highlight
              ? "bg-accent text-white shadow-[0_4px_14px_-4px_hsl(var(--accent)/0.5)] hover:bg-accent/90"
              : "bg-surface text-foreground ring-1 ring-border hover:ring-accent/30",
          )}
        >
          {isCurrent ? "Current plan" : cta}
          {!isCurrent && <ArrowRight className="size-3.5" strokeWidth={2.5} />}
        </Link>

        {/* Features */}
        <div className="space-y-2">
          {features.map((f) => (
            <div key={f} className="flex items-start gap-2">
              <Check className="size-3.5 mt-0.5 shrink-0 text-positive" strokeWidth={2.5} />
              <span className="text-[12.5px] text-foreground/80">{f}</span>
            </div>
          ))}
          {notIncluded.map((f) => (
            <div key={f} className="flex items-start gap-2 opacity-45">
              <X className="size-3 mt-0.5 shrink-0 text-muted-foreground" strokeWidth={2} />
              <span className="text-[12px] text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Infinity dropdown ────────────────────────────────────────────────────────

function InfinityDropdown({
  annual,
  selectedTier,
  onSelect,
}: {
  annual: boolean;
  selectedTier: InfinityTier;
  onSelect: (t: InfinityTier) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5 text-left text-[12.5px] ring-1 ring-border transition hover:ring-accent/30"
      >
        <span className="font-medium text-foreground">{selectedTier.label}</span>
        <div className="flex items-center gap-2 shrink-0">
          {selectedTier.discount && (
            <span className="rounded-full bg-positive/12 px-1.5 py-0.5 text-[9px] font-bold text-positive">
              {Math.round((selectedTier.discount + (annual ? ANNUAL_DISCOUNT : 0)) * 100)}% off
            </span>
          )}
          {!selectedTier.discount && annual && (
            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">20% off</span>
          )}
          <span className="font-semibold text-foreground">${tierPrice(selectedTier, annual)}<span className="font-normal text-muted-foreground">/mo</span></span>
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} strokeWidth={2} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl bg-background ring-1 ring-border shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]"
          >
            {INFINITY_TIERS.map((t) => {
              const price = tierPrice(t, annual);
              const original = tierOriginalPrice(t);
              const totalDiscount = t.discount ? t.discount + (annual ? ANNUAL_DISCOUNT : 0) : (annual ? ANNUAL_DISCOUNT : 0);
              const isSelected = t.id === selectedTier.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { onSelect(t); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-[12px] transition hover:bg-surface",
                    isSelected && "bg-accent/8",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <span className={cn("font-medium", isSelected ? "text-accent" : "text-foreground")}>{t.label}</span>
                    <span className="ml-2 text-muted-foreground">{t.credits.toLocaleString()} credits/mo</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {totalDiscount > 0 && (
                      <span className="rounded-full bg-positive/12 px-1.5 py-0.5 text-[9px] font-bold text-positive">
                        {Math.round(totalDiscount * 100)}% off
                      </span>
                    )}
                    {price !== original && (
                      <span className="text-muted-foreground/40 line-through text-[11px]">${original}</span>
                    )}
                    <span className="font-semibold text-foreground">${price}<span className="font-normal text-muted-foreground text-[10px]">/mo</span></span>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function PricingView() {
  const { profile } = useAuthStore();
  const [annual, setAnnual] = React.useState(false);
  const [infTier, setInfTier] = React.useState<InfinityTier>(INFINITY_TIERS[0]);

  const planId = profile?.plan_id ?? null;

  const starterMonthly = 20;
  const proMonthly = 50;
  const starterAnnual = Math.round(starterMonthly * (1 - ANNUAL_DISCOUNT));
  const proAnnual = Math.round(proMonthly * (1 - ANNUAL_DISCOUNT));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 space-y-20">

      {/* Hero */}
      <motion.div
        variants={variants.staggerContainer}
        initial="hidden"
        animate="show"
        className="text-center space-y-4"
      >
        <motion.div variants={variants.fadeUp}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[12px] font-semibold text-accent ring-1 ring-accent/20">
            <Sparkles className="size-3" strokeWidth={2} />
            Simple, transparent pricing
          </span>
        </motion.div>
        <motion.h1 variants={variants.fadeUp} className="text-[36px] sm:text-[48px] font-bold tracking-tight text-foreground leading-[1.1]">
          Build anything with AI.
          <br className="hidden sm:block" />
          <span className="text-accent"> Pay only for what you use.</span>
        </motion.h1>
        <motion.p variants={variants.fadeUp} className="max-w-xl mx-auto text-[15px] text-muted-foreground leading-relaxed">
          Every plan includes AI app generation, instant deployment, and real-time collaboration. Credits reset monthly — no commitments.
        </motion.p>
        {/* Billing toggle */}
        <motion.div variants={variants.fadeUp} className="flex items-center justify-center gap-3 pt-2">
          <span className={cn("text-[13px]", !annual ? "font-semibold text-foreground" : "text-muted-foreground")}>Monthly</span>
          <button
            type="button"
            onClick={() => setAnnual((v) => !v)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              annual ? "bg-accent" : "bg-border",
            )}
            aria-label="Toggle annual billing"
          >
            <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", annual && "translate-x-5")} />
          </button>
          <span className={cn("text-[13px]", annual ? "font-semibold text-foreground" : "text-muted-foreground")}>
            Annual
            <span className="ml-1.5 rounded-full bg-positive/15 px-1.5 py-0.5 text-[10px] font-bold text-positive">Save 20%</span>
          </span>
        </motion.div>
      </motion.div>

      {/* Plan cards */}
      <motion.div
        variants={variants.staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <PlanCard
          id="free"
          name="Free"
          price={0}
          annual={annual}
          credits={`${FREE_CREDITS} credits / mo`}
          tagline="Start building for free. No card required."
          features={[
            `${FREE_CREDITS} credits / month`,
            "3 active projects",
            "Discuss mode",
            "Public deployments",
            "Automatic model routing",
          ]}
          notIncluded={[
            "Manual model selection",
            "Edit & Build mode",
            "Custom domains",
            "Team access",
          ]}
          cta="Get started free"
          currentPlanId={planId}
        />

        <PlanCard
          id="starter"
          name="Starter"
          price={starterMonthly}
          annualPrice={starterAnnual}
          annual={annual}
          credits="1,000 credits / mo"
          tagline="For individuals shipping real products."
          features={[
            "1,000 credits / month",
            "Unlimited projects",
            "Discuss, Edit & Build modes",
            "Manual model selection",
            "Custom domains",
            "Remove watermark",
            "Full source code export",
            "Email support",
          ]}
          cta="Get Starter"
          currentPlanId={planId}
        />

        <PlanCard
          id="pro"
          name="Pro"
          price={proMonthly}
          annualPrice={proAnnual}
          annual={annual}
          credits="2,500 credits / mo"
          tagline="For teams building production apps."
          highlight
          badge="Most Popular"
          features={[
            "2,500 credits / month",
            "All frontier models",
            "Multi-agent generation",
            "5 collaborators",
            "Advanced analytics",
            "API access",
            "Unlimited custom domains",
            "Priority support",
          ]}
          cta="Get Pro"
          currentPlanId={planId}
        />

        <PlanCard
          id="infinity"
          name="Infinity"
          price={tierPrice(infTier, annual)}
          annual={annual}
          credits={`${infTier.credits.toLocaleString()} credits / mo`}
          tagline="For power teams that need unlimited scale."
          features={[
            `${infTier.credits.toLocaleString()} credits / month`,
            "All frontier models",
            "Dedicated compute",
            "White-label",
            "Custom SLAs",
            "SSO / SAML",
            "Dedicated support",
          ]}
          cta="Get Infinity"
          currentPlanId={planId}
        >
          <InfinityDropdown annual={annual} selectedTier={infTier} onSelect={setInfTier} />
        </PlanCard>
      </motion.div>

      {/* Custom plan banner */}
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        className="rounded-[var(--radius-xl)] bg-gradient-to-r from-accent/8 via-background to-violet-500/8 ring-1 ring-border px-8 py-8"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
              <Building2 className="size-5 text-accent" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-foreground">Need a custom plan?</p>
              <p className="mt-1 text-[13.5px] text-muted-foreground max-w-lg">
                Tell us your scale, team size, model usage, and infrastructure needs. We'll build a plan that fits.
              </p>
            </div>
          </div>
          <div className="flex gap-2.5 sm:shrink-0">
            <a
              href="mailto:support@dreamos86.com"
              className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent/90"
            >
              <MessageCircle className="size-4" strokeWidth={1.75} />
              Contact us
            </a>
            <a
              href="mailto:sales@dreamos86.com"
              className="flex items-center gap-2 rounded-xl bg-surface px-5 py-2.5 text-[13px] font-semibold text-foreground ring-1 ring-border transition hover:ring-accent/30"
            >
              Talk to sales
            </a>
          </div>
        </div>
      </motion.div>

      {/* Comparison table */}
      <motion.div variants={variants.fadeUp} initial="hidden" animate="show">
        <h2 className="text-[22px] font-bold tracking-tight text-foreground mb-6 text-center">Compare plans</h2>
        <div className="overflow-x-auto rounded-[var(--radius-xl)] ring-1 ring-border">
          <table className="w-full min-w-[600px] text-center text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-4 py-3 text-left text-[12px] font-semibold text-muted-foreground w-48">Feature</th>
                {["Free", "Starter", "Pro", "Infinity"].map((p) => (
                  <th key={p} className={cn("px-4 py-3 text-[12px] font-semibold", p === "Pro" ? "text-accent" : "text-foreground")}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.label} className={cn("border-b border-border/50 transition hover:bg-surface/30", i % 2 === 0 && "bg-surface/10")}>
                  <td className="px-4 py-3 text-left text-[12.5px] text-foreground/80 font-medium">{row.label}</td>
                  <td className="px-4 py-3"><Cell value={row.free} /></td>
                  <td className="px-4 py-3"><Cell value={row.starter} /></td>
                  <td className="px-4 py-3"><Cell value={row.pro} /></td>
                  <td className="px-4 py-3"><Cell value={row.infinity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* FAQ */}
      <motion.div variants={variants.fadeUp} initial="hidden" animate="show">
        <h2 className="text-[22px] font-bold tracking-tight text-foreground mb-6 text-center">Frequently asked questions</h2>
        <div className="mx-auto max-w-2xl rounded-[var(--radius-xl)] bg-background ring-1 ring-border px-6 divide-y divide-border/50">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </motion.div>

    </div>
  );
}
