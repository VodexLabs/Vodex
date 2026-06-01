/** Deterministic developer-portfolio preview HTML (no TSX runtime). */

export function isPortfolioPreview(
  files: Array<{ path: string; content: string }>,
  archetypeId?: string | null,
): boolean {
  if (archetypeId === "portfolio" || archetypeId === "developer_portfolio") return true;
  const paths = files.map((f) => f.path.replace(/\\/g, "/").toLowerCase());
  const hasData = paths.some((p) => p === "lib/portfolio-data.ts" || p.endsWith("/portfolio-data.ts"));
  const hasHero = paths.some((p) => /components\/herosection\.(tsx|jsx)$/i.test(p));
  return hasData && hasHero;
}

export function buildPortfolioPreviewBody(appName = "Portfolio"): string {
  const name = appName.replace(/\*\*/g, "").trim() || "Portfolio";
  return `
    <div class="min-h-screen bg-[#0b1020] text-slate-200 antialiased">
      <header class="sticky top-0 z-30 border-b border-white/10 bg-[#0b1020]/85 backdrop-blur-xl">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span class="text-sm font-bold tracking-tight text-white">${name}</span>
          <nav class="flex gap-2 text-sm">
            <span class="rounded-lg bg-white/10 px-3 py-1.5 text-white">Home</span>
            <span class="rounded-lg px-3 py-1.5 text-slate-300">Projects</span>
            <span class="rounded-lg px-3 py-1.5 text-slate-300">About</span>
            <span class="rounded-lg px-3 py-1.5 text-slate-300">Contact</span>
          </nav>
        </div>
      </header>
      <section class="relative overflow-hidden px-4 pb-20 pt-16 text-center">
        <div class="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/35 blur-3xl"></div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Developer portfolio</p>
        <h1 class="mt-4 text-4xl font-bold tracking-tight text-white sm:text-6xl">${name}</h1>
        <p class="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
          Animated hero, project showcase, skills, testimonials, and contact — built with Vodex.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <span class="inline-flex rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30">View projects</span>
          <span class="inline-flex rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white">Get in touch</span>
        </div>
      </section>
      <section class="mx-auto max-w-6xl px-4 py-12" data-testid="portfolio-projects">
        <h2 class="text-2xl font-bold text-white">Featured work</h2>
        <p class="mt-2 text-sm text-slate-400">Selected builds with measurable outcomes.</p>
        <div class="mt-8 grid gap-5 sm:grid-cols-2">
          <article class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <p class="text-xs font-medium text-indigo-300">React · Design</p>
            <h3 class="mt-2 text-lg font-semibold text-white">Nebula Design System</h3>
            <p class="mt-2 text-sm text-slate-400">Component library and docs for a product team.</p>
          </article>
          <article class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <p class="text-xs font-medium text-indigo-300">Next.js · Data</p>
            <h3 class="mt-2 text-lg font-semibold text-white">Pulse Analytics</h3>
            <p class="mt-2 text-sm text-slate-400">Real-time dashboard for growth metrics.</p>
          </article>
          <article class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <p class="text-xs font-medium text-indigo-300">React Native</p>
            <h3 class="mt-2 text-lg font-semibold text-white">Orbit Mobile</h3>
            <p class="mt-2 text-sm text-slate-400">Cross-platform app with offline sync.</p>
          </article>
          <article class="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <p class="text-xs font-medium text-indigo-300">Node · GraphQL</p>
            <h3 class="mt-2 text-lg font-semibold text-white">Studio API</h3>
            <p class="mt-2 text-sm text-slate-400">Public API and developer portal.</p>
          </article>
        </div>
      </section>
      <section class="mx-auto max-w-6xl px-4 py-12" data-testid="portfolio-skills">
        <h2 class="text-2xl font-bold text-white">Skills</h2>
        <div class="mt-6 grid gap-4 md:grid-cols-3">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 class="text-sm font-semibold text-indigo-300">Frontend</h3>
            <p class="mt-3 text-xs text-slate-300">React · Next.js · TypeScript · Tailwind · Framer Motion</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 class="text-sm font-semibold text-indigo-300">Backend</h3>
            <p class="mt-3 text-xs text-slate-300">Node.js · Postgres · Supabase · REST · GraphQL</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 class="text-sm font-semibold text-indigo-300">Design</h3>
            <p class="mt-3 text-xs text-slate-300">Figma · Design systems · Prototyping · Accessibility</p>
          </div>
        </div>
      </section>
      <section class="mx-auto max-w-6xl px-4 py-12" data-testid="portfolio-testimonials">
        <h2 class="text-2xl font-bold text-white">Testimonials</h2>
        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <blockquote class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p class="text-sm leading-relaxed text-slate-200">&ldquo;Delivered a polished portfolio and ship-ready components in days.&rdquo;</p>
            <footer class="mt-4 text-xs text-slate-400"><span class="font-semibold text-white">Alex Rivera</span> — Product Lead</footer>
          </blockquote>
          <blockquote class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p class="text-sm leading-relaxed text-slate-200">&ldquo;Strong eye for motion and detail — our launch metrics jumped.&rdquo;</p>
            <footer class="mt-4 text-xs text-slate-400"><span class="font-semibold text-white">Sam Chen</span> — Founder</footer>
          </blockquote>
        </div>
      </section>
      <section class="mx-auto max-w-lg px-4 pb-20" data-testid="portfolio-contact">
        <form class="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h2 class="text-xl font-bold text-white">Contact</h2>
          <input placeholder="Name" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
          <input placeholder="Email" type="email" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
          <textarea placeholder="Message" rows="4" class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"></textarea>
          <button type="button" class="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white">Send message</button>
        </form>
      </section>
    </div>
  `;
}
