import type { BuildFile } from "@/lib/build/generated-file-utils";
import { normalizeBuildFilePath } from "@/lib/build/generated-file-utils";
import { fileMeetsMeaningfulThreshold } from "@/lib/build/source-integrity-validator";
import { dreamOSBrandingLayoutFooterJsx } from "@/lib/branding/generated-app-branding";

/** Full developer portfolio scaffold with hero, projects, skills, testimonials, contact. */
export function portfolioScaffoldFiles(appName: string): BuildFile[] {
  const name = appName.trim() || "Portfolio";
  const safe = name.replace(/"/g, '\\"');

  const files: BuildFile[] = [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "dreamos-portfolio",
          private: true,
          scripts: { dev: "next dev", build: "next build", start: "next start" },
          dependencies: {
            next: "15.1.0",
            react: "19.0.0",
            "react-dom": "19.0.0",
            "framer-motion": "^11.0.0",
            "lucide-react": "^0.460.0",
          },
        },
        null,
        2,
      ),
    },
    {
      path: "app/globals.css",
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --accent: #6366f1;
  --bg: #0b1020;
}
body {
  background: radial-gradient(1200px 600px at 10% -10%, rgba(99, 102, 241, 0.25), transparent),
    var(--bg);
  color: #e2e8f0;
}
.glass {
  @apply rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md;
}
.btn-primary {
  @apply inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.animate-float {
  animation: float 5s ease-in-out infinite;
}
.hero-grid {
  background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0);
  background-size: 32px 32px;
}
`,
    },
    {
      path: "app/layout.tsx",
      content: `import "./globals.css";
import Link from "next/link";

const nav = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const metadata = { title: "${safe}" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1020]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-sm font-bold tracking-tight text-white">${safe}</Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg px-3 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main>{children}</main>${dreamOSBrandingLayoutFooterJsx()}
      </body>
    </html>
  );
}
`,
    },
    {
      path: "lib/portfolio-data.ts",
      content: `export const projects = [
  { id: "1", title: "Nebula Design System", tag: "React · Design", summary: "Component library and docs for a product team.", href: "#" },
  { id: "2", title: "Pulse Analytics", tag: "Next.js · Data", summary: "Real-time dashboard for growth metrics.", href: "#" },
  { id: "3", title: "Orbit Mobile", tag: "React Native", summary: "Cross-platform app with offline sync.", href: "#" },
  { id: "4", title: "Studio API", tag: "Node · GraphQL", summary: "Public API and developer portal.", href: "#" },
];

export const skills = [
  { group: "Frontend", items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"] },
  { group: "Backend", items: ["Node.js", "Postgres", "Supabase", "REST", "GraphQL"] },
  { group: "Design", items: ["Figma", "Design systems", "Prototyping", "Accessibility"] },
];

export const testimonials = [
  { quote: "Delivered a polished portfolio and ship-ready components in days.", name: "Alex Rivera", role: "Product Lead, Northwind" },
  { quote: "Strong eye for motion and detail — our launch metrics jumped.", name: "Sam Chen", role: "Founder, Lumen Labs" },
  { quote: "Turned a vague brief into a launch-ready product with crisp UX and clean code.", name: "Jordan Lee", role: "Engineering Manager, Atlas" },
];

export const experience = [
  { company: "Northwind Studio", role: "Senior Frontend Engineer", period: "2022 — Present", highlights: ["Led design system adoption", "Shipped 0→1 analytics dashboard", "Mentored 4 engineers"] },
  { company: "Lumen Labs", role: "Full-stack Developer", period: "2019 — 2022", highlights: ["Built customer portal in Next.js", "Reduced LCP 38%", "Introduced CI preview deploys"] },
  { company: "Freelance", role: "Product Developer", period: "2016 — 2019", highlights: ["12+ client launches", "Brand + web for startups", "Mobile + web prototypes"] },
];

export const processSteps = [
  { title: "Discover", body: "Stakeholder interviews, analytics review, and sharp problem framing." },
  { title: "Design", body: "Wireframes, motion studies, and a cohesive visual language in Figma." },
  { title: "Build", body: "Typed React components, accessible patterns, and performance budgets." },
  { title: "Ship", body: "Preview deploys, QA, instrumentation, and iterative polish after launch." },
];

export const blogPosts = [
  { slug: "design-systems-at-scale", title: "Design systems at scale", excerpt: "How we rolled out tokens, documentation, and governance across twelve product squads without slowing delivery.", date: "2025-11-02", readMinutes: 8 },
  { slug: "nextjs-performance-playbook", title: "Next.js performance playbook", excerpt: "Practical techniques for LCP, INP, and bundle hygiene on content-heavy marketing sites.", date: "2025-09-18", readMinutes: 11 },
  { slug: "motion-without-jank", title: "Motion without jank", excerpt: "Framer Motion patterns that respect reduced motion and keep 60fps on mid-tier devices.", date: "2025-07-04", readMinutes: 6 },
  { slug: "shipping-portfolios-fast", title: "Shipping portfolios fast", excerpt: "A repeatable stack for animated hero sections, project grids, and contact flows.", date: "2025-05-21", readMinutes: 9 },
];

export const stats = [
  { label: "Products shipped", value: "24+" },
  { label: "Avg. Lighthouse", value: "96" },
  { label: "Teams supported", value: "9" },
  { label: "Years building", value: "8" },
];

export const services = [
  {
    id: "product-ui",
    title: "Product UI engineering",
    summary:
      "End-to-end UI for SaaS dashboards, onboarding flows, and marketing sites with accessible components and documented design tokens.",
    bullets: ["Design system implementation", "Storybook + visual QA", "Performance budgets"],
  },
  {
    id: "portfolio",
    title: "Portfolio & brand sites",
    summary:
      "Animated hero sections, case study layouts, and contact funnels optimized for conversion and Core Web Vitals.",
    bullets: ["Motion design", "CMS-ready sections", "SEO metadata"],
  },
  {
    id: "audit",
    title: "Frontend audit & rescue",
    summary:
      "Stabilize legacy React codebases, fix regressions, and establish testing and preview deploy workflows.",
    bullets: ["Bundle analysis", "Accessibility fixes", "CI preview pipelines"],
  },
];
`,
    },
    {
      path: "components/HeroSection.tsx",
      content: `"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function HeroSection({ name }: { name: string }) {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-4xl text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Developer portfolio</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-6xl">{name}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
          I craft animated, accessible web experiences — from design systems to full-stack products.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/projects" className="btn-primary">View projects</Link>
          <Link href="/contact" className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
            Get in touch
          </Link>
        </div>
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/30 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
    </section>
  );
}
`,
    },
    {
      path: "components/ProjectGrid.tsx",
      content: `import { projects } from "@/lib/portfolio-data";

export function ProjectGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="text-2xl font-bold text-white">Featured work</h2>
      <p className="mt-2 text-sm text-slate-400">Selected builds with measurable outcomes.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {projects.map((p) => (
          <article key={p.id} className="glass group p-5 transition hover:border-indigo-400/40">
            <p className="text-xs font-medium text-indigo-300">{p.tag}</p>
            <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-indigo-200">{p.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{p.summary}</p>
            <a href={p.href} className="mt-4 inline-block text-sm font-semibold text-indigo-400 hover:text-indigo-300">
              Case study →
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
`,
    },
    {
      path: "components/SkillsSection.tsx",
      content: `import { skills } from "@/lib/portfolio-data";

export function SkillsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="text-2xl font-bold text-white">Skills</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {skills.map((block) => (
          <div key={block.group} className="glass p-5">
            <h3 className="text-sm font-semibold text-indigo-300">{block.group}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {block.items.map((item) => (
                <li key={item} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs text-slate-200">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
`,
    },
    {
      path: "components/TestimonialsSection.tsx",
      content: `import { testimonials } from "@/lib/portfolio-data";

export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="text-2xl font-bold text-white">Testimonials</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {testimonials.map((t) => (
          <blockquote key={t.name} className="glass p-6">
            <p className="text-sm leading-relaxed text-slate-200">&ldquo;{t.quote}&rdquo;</p>
            <footer className="mt-4 text-xs text-slate-400">
              <span className="font-semibold text-white">{t.name}</span> — {t.role}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
`,
    },
    {
      path: "components/ContactForm.tsx",
      content: `"use client";

import { useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  return (
    <form
      className="glass mx-auto max-w-lg space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <h2 className="text-xl font-bold text-white">Contact</h2>
      <label className="block text-xs font-medium text-slate-400">Name</label>
      <input required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
      <label className="block text-xs font-medium text-slate-400">Email</label>
      <input type="email" required className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
      <label className="block text-xs font-medium text-slate-400">Message</label>
      <textarea required rows={4} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
      <button type="submit" className="btn-primary w-full">{sent ? "Message sent" : "Send message"}</button>
    </form>
  );
}
`,
    },
    {
      path: "app/page.tsx",
      content: `import { HeroSection } from "@/components/HeroSection";
import { ProjectGrid } from "@/components/ProjectGrid";
import { SkillsSection } from "@/components/SkillsSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { ContactForm } from "@/components/ContactForm";
import { AnimatedGradient } from "@/components/AnimatedGradient";
import { PortfolioFooter } from "@/components/PortfolioFooter";
import { ExperienceTimeline } from "@/components/ExperienceTimeline";
import { ProcessSection } from "@/components/ProcessSection";
import { StatsBar } from "@/components/StatsBar";
import { BlogPreview } from "@/components/BlogPreview";
import { CaseStudyHighlight } from "@/components/CaseStudyHighlight";
import { ServicesSection } from "@/components/ServicesSection";

export default function HomePage() {
  return (
    <>
      <HeroSection name="${safe}" />
      <StatsBar />
      <ProjectGrid />
      <CaseStudyHighlight />
      <ProcessSection />
      <ServicesSection />
      <SkillsSection />
      <ExperienceTimeline />
      <TestimonialsSection />
      <BlogPreview />
      <AnimatedGradient />
      <section className="pb-20">
        <ContactForm />
      </section>
      <PortfolioFooter name="${safe}" />
    </>
  );
}
`,
    },
    {
      path: "app/projects/page.tsx",
      content: `import { ProjectGrid } from "@/components/ProjectGrid";

export default function ProjectsPage() {
  return (
    <div className="px-4 py-10">
      <h1 className="mx-auto max-w-6xl text-3xl font-bold text-white">All projects</h1>
      <ProjectGrid />
    </div>
  );
}
`,
    },
    {
      path: "app/about/page.tsx",
      content: `import { SkillsSection } from "@/components/SkillsSection";
import { TestimonialsSection } from "@/components/TestimonialsSection";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <section>
        <h1 className="text-3xl font-bold text-white">About</h1>
        <p className="mt-4 text-slate-300 leading-relaxed">
          I am a full-stack developer focused on polished interfaces, performance, and maintainable architecture.
          This portfolio highlights shipped products, design systems, and client work.
        </p>
      </section>
      <SkillsSection />
      <TestimonialsSection />
    </div>
  );
}
`,
    },
    {
      path: "app/contact/page.tsx",
      content: `import { ContactForm } from "@/components/ContactForm";

export default function ContactPage() {
  return (
    <div className="px-4 py-12">
      <ContactForm />
    </div>
  );
}
`,
    },
    {
      path: "components/PortfolioFooter.tsx",
      content: `import Link from "next/link";

const links = [
  { href: "https://github.com", label: "GitHub" },
  { href: "https://linkedin.com", label: "LinkedIn" },
  { href: "mailto:hello@example.com", label: "Email" },
];

export function PortfolioFooter({ name }: { name: string }) {
  return (
    <footer className="border-t border-white/10 bg-[#080c18]/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-white">{name}</p>
          <p className="mt-1 max-w-md text-xs text-slate-400">
            Full-stack developer building animated, accessible product experiences — portfolios,
            dashboards, and design systems shipped with Next.js, React, and modern tooling.
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-indigo-300 hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="pb-6 text-center text-[10px] text-slate-500">
        © {new Date().getFullYear()} {name}. Crafted with DreamOS86.
      </p>
    </footer>
  );
}
`,
    },
    {
      path: "components/StatsBar.tsx",
      content: `import { stats } from "@/lib/portfolio-data";

export function StatsBar() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
`,
    },
    {
      path: "components/BlogPreview.tsx",
      content: `import Link from "next/link";
import { blogPosts } from "@/lib/portfolio-data";

export function BlogPreview() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Writing</h2>
          <p className="mt-2 text-sm text-slate-400">Notes on design systems, performance, and shipping UI.</p>
        </div>
        <Link href="/blog" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
          View all →
        </Link>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {blogPosts.slice(0, 4).map((post) => (
          <article key={post.slug} className="glass group p-5 transition hover:border-indigo-400/30">
            <p className="text-xs text-slate-500">{post.date} · {post.readMinutes} min read</p>
            <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-indigo-200">{post.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{post.excerpt}</p>
            <Link href={"/blog/" + post.slug} className="mt-4 inline-block text-sm font-semibold text-indigo-400">
              Read article →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
`,
    },
    {
      path: "app/blog/page.tsx",
      content: `import { BlogPreview } from "@/components/BlogPreview";

export const metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <div className="px-4 py-10">
      <h1 className="mx-auto max-w-6xl text-3xl font-bold text-white">Blog</h1>
      <BlogPreview />
    </div>
  );
}
`,
    },
    {
      path: "components/ExperienceTimeline.tsx",
      content: `import { experience } from "@/lib/portfolio-data";

export function ExperienceTimeline() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="text-2xl font-bold text-white">Experience</h2>
      <ol className="mt-8 space-y-6 border-l border-white/10 pl-6">
        {experience.map((job) => (
          <li key={job.company} className="relative">
            <span className="absolute -left-[1.62rem] top-1.5 size-2.5 rounded-full bg-indigo-400 ring-4 ring-[#0b1020]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">{job.period}</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{job.role}</h3>
            <p className="text-sm text-slate-400">{job.company}</p>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-300">
              {job.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
`,
    },
    {
      path: "components/ProcessSection.tsx",
      content: `import { processSteps } from "@/lib/portfolio-data";

export function ProcessSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="text-2xl font-bold text-white">How I work</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {processSteps.map((step, i) => (
          <article key={step.title} className="glass p-5">
            <span className="text-xs font-bold text-indigo-300">0{i + 1}</span>
            <h3 className="mt-2 font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
`,
    },
    {
      path: "README.md",
      content: `# ${safe} — Developer Portfolio

This project is a Next.js portfolio generated by DreamOS86. It includes an animated hero, project showcase,
skills grid, testimonials, blog preview, experience timeline, and a contact form.

## Structure

- \`app/page.tsx\` — landing page composing all marketing sections
- \`components/*\` — reusable UI sections (hero, projects, skills, contact)
- \`lib/portfolio-data.ts\` — demo content for projects, skills, testimonials, and blog posts
- \`lib/portfolio-theme.ts\` — design tokens and shared marketing copy

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

Open http://localhost:3000 to preview. Tailwind utility classes power layout and responsive behavior.
Framer Motion drives hero and background animations. Replace demo copy in \`lib/portfolio-data.ts\` with your
own projects and metrics before publishing.

## Customization checklist

1. Update hero name and positioning statement in \`HeroSection\`.
2. Swap project cards in \`lib/portfolio-data.ts\`.
3. Point social links in \`PortfolioFooter\` to your profiles.
4. Wire the contact form to your API route or form provider.
5. Add OG images and metadata in \`app/layout.tsx\`.

## Quality bar

DreamOS86 enforces meaningful file sizes and real section content — not placeholder routes. Each component
should remain readable in the Code tab and render in the static preview snapshot.
`,
    },
    {
      path: "lib/portfolio-theme.ts",
      content: `/** Design tokens for the portfolio — consumed by components and global styles. */
export const portfolioTheme = {
  colors: {
    background: "#0b1020",
    surface: "rgba(255,255,255,0.05)",
    accent: "#6366f1",
    accentMuted: "#818cf8",
    text: "#e2e8f0",
    textMuted: "#94a3b8",
  },
  radii: { sm: "0.5rem", md: "0.75rem", lg: "1rem", xl: "1.25rem", "2xl": "1.5rem" },
  shadows: {
    card: "0 20px 50px -20px rgba(99, 102, 241, 0.35)",
    glow: "0 0 80px rgba(99, 102, 241, 0.25)",
  },
  typography: {
    hero: "clamp(2.25rem, 5vw, 3.75rem)",
    section: "1.5rem",
    body: "0.875rem",
  },
  motion: {
    heroDuration: 0.6,
    stagger: 0.08,
    spring: { type: "spring", stiffness: 120, damping: 18 },
  },
} as const;

export const sectionCopy = {
  hero: {
    eyebrow: "Developer portfolio",
    subhead:
      "I design and ship animated marketing sites, SaaS dashboards, and design systems with Next.js, TypeScript, and Tailwind CSS.",
  },
  projects: {
    title: "Featured work",
    subtitle: "Case studies across product design, frontend architecture, and full-stack delivery.",
  },
  skills: {
    title: "Skills",
    subtitle: "Depth across UI engineering, API design, and collaborative product discovery.",
  },
  contact: {
    title: "Let's build something remarkable",
    subtitle: "Tell me about your product, timeline, and goals — I reply within one business day.",
  },
};
`,
    },
    {
      path: "components/ServicesSection.tsx",
      content: `import Link from "next/link";
import { services } from "@/lib/portfolio-data";

export function ServicesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="text-2xl font-bold text-white">Services</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        Engagements are scoped for clarity — fixed milestones, async updates, and preview links you can share with stakeholders.
      </p>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {services.map((svc) => (
          <article key={svc.id} className="glass flex flex-col p-6">
            <h3 className="text-lg font-semibold text-white">{svc.title}</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{svc.summary}</p>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              {svc.bullets.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
            <Link href="/contact" className="btn-primary mt-6 text-center text-sm">
              Start a project
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
`,
    },
    {
      path: "components/CaseStudyHighlight.tsx",
      content: `import { projects } from "@/lib/portfolio-data";
import { sectionCopy } from "@/lib/portfolio-theme";

export function CaseStudyHighlight() {
  const featured = projects[0];
  if (!featured) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Case study</p>
      <h2 className="mt-2 text-2xl font-bold text-white">{sectionCopy.projects.title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">{sectionCopy.projects.subtitle}</p>
      <article className="mt-8 grid gap-8 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-transparent p-8 lg:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-indigo-300">{featured.tag}</p>
          <h3 className="mt-2 text-2xl font-bold text-white">{featured.title}</h3>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">{featured.summary}</p>
          <p className="mt-4 text-sm text-slate-400">
            Outcomes included faster design handoff, documented component APIs, and a 35% reduction in UI regressions
            after introducing visual regression tests and Storybook-driven reviews.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-3 rounded-xl border border-white/10 bg-black/20 p-6">
          <p className="text-xs font-semibold uppercase text-slate-500">Highlights</p>
          <ul className="space-y-2 text-sm text-slate-200">
            <li>• Tokenized color, spacing, and typography across 40+ components</li>
            <li>• Documented patterns for forms, tables, and empty states</li>
            <li>• Lighthouse 96+ on marketing pages with optimized media</li>
            <li>• Accessible focus states and keyboard flows audited with axe</li>
          </ul>
        </div>
      </article>
    </section>
  );
}
`,
    },
    {
      path: "components/AnimatedGradient.tsx",
      content: `"use client";

import { motion } from "framer-motion";

export function AnimatedGradient() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -left-1/4 top-0 h-[420px] w-[420px] rounded-full bg-violet-600/25 blur-3xl"
        animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 top-1/3 h-[380px] w-[380px] rounded-full bg-indigo-500/20 blur-3xl"
        animate={{ x: [0, -60, 0], y: [0, -30, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full bg-cyan-500/15 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
`,
    },
  ];

  return files.map((f) => ({ ...f, path: normalizeBuildFilePath(f.path) }));
}

export function mergePortfolioScaffold(files: BuildFile[], appName: string): BuildFile[] {
  const scaffold = portfolioScaffoldFiles(appName);
  const byPath = new Map<string, BuildFile>();
  for (const f of scaffold) byPath.set(f.path, f);
  for (const f of files) {
    const path = normalizeBuildFilePath(f.path);
    if (!path || !f.content?.trim()) continue;
    if (fileMeetsMeaningfulThreshold({ path, content: f.content })) {
      byPath.set(path, { path, content: f.content });
    }
  }
  return [...byPath.values()];
}
