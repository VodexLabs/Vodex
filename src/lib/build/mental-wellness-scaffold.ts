import type { BuildFile } from "@/lib/build/generated-file-utils";
import { normalizeBuildFilePath } from "@/lib/build/generated-file-utils";
import { shouldReplaceWithScaffold } from "@/lib/build/root-page-repair";
import {
  dreamOSBrandingLayoutFooterJsx,
  dreamOSLoginPageScaffold,
} from "@/lib/branding/generated-app-branding";

function esc(s: string): string {
  return s.replace(/"/g, '\\"');
}

/** Premium mental wellness journal scaffold — rich root page and multi-route UI. */
export function mentalWellnessScaffoldFiles(appName: string): BuildFile[] {
  const name = appName.trim() || "CalmPath";
  const e = esc(name);

  const files: BuildFile[] = [
    {
      path: "app/layout.tsx",
      content: `import "./globals.css";
import Link from "next/link";

export const metadata = { title: "${e} — Mental wellness journal" };

const nav = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/check-ins", label: "Check-ins" },
  { href: "/journal", label: "Journal" },
  { href: "/prompts", label: "Guided prompts" },
  { href: "/insights", label: "Insights" },
  { href: "/private-messages", label: "Private messages" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-gradient-to-b from-teal-50/80 via-white to-violet-50/40 text-slate-900 antialiased">
        <header className="sticky top-0 z-20 border-b border-teal-100/80 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-sm font-semibold tracking-tight text-teal-900">${e}</Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-teal-50 hover:text-teal-900">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>${dreamOSBrandingLayoutFooterJsx()}
      </body>
    </html>
  );
}
`,
    },
    {
      path: "app/login/page.tsx",
      content: dreamOSLoginPageScaffold(name),
    },
    {
      path: "app/globals.css",
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;
body { font-feature-settings: "ss01"; }
.card { @apply rounded-2xl border border-teal-100/80 bg-white/90 p-5 shadow-sm backdrop-blur; }
.mood-pill { @apply inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold; }
.hero-gradient { background: linear-gradient(135deg, #0d9488 0%, #6366f1 55%, #a78bfa 100%); }
`,
    },
    {
      path: "app/page.tsx",
      content: `import Link from "next/link";
import { MoodCheckInCard } from "@/components/MoodCheckInCard";
import { GuidedPromptCard } from "@/components/GuidedPromptCard";
import { MoodTrendChart } from "@/components/MoodTrendChart";
import { InsightCards } from "@/components/InsightCards";
import { PrivateMessagePanel } from "@/components/PrivateMessagePanel";
import { todayMood, guidedPrompt, weeklyTrend, trustCopy } from "@/lib/mental-wellness-data";

export default function HomePage() {
  return (
    <div className="space-y-8 pb-10">
      <section className="hero-gradient relative overflow-hidden rounded-3xl px-6 py-12 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/80">Your calm space</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">${e}</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/90">
            A private mental wellness journal with daily mood check-ins, guided reflection prompts,
            trend insights, and end-to-end encrypted messaging when you need a trusted channel.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/check-ins" className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-teal-800 shadow">
              Start today&apos;s check-in
            </Link>
            <Link href="/journal" className="rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-white">
              Open journal
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full bg-white/10 blur-2xl" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <MoodCheckInCard mood={todayMood} />
        <GuidedPromptCard prompt={guidedPrompt} />
      </div>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Mood trend preview</h2>
            <p className="text-sm text-slate-600">Seven-day emotional rhythm — open Insights for full breakdowns.</p>
          </div>
          <Link href="/insights" className="text-sm font-semibold text-teal-700 hover:underline">
            View all insights →
          </Link>
        </div>
        <div className="mt-4">
          <MoodTrendChart points={weeklyTrend} />
        </div>
      </section>

      <InsightCards />

      <section className="grid gap-6 md:grid-cols-2">
        <PrivateMessagePanel trust={trustCopy} />
        <div className="card flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold">Continue your practice</h2>
            <p className="mt-2 text-sm text-slate-600">
              Jump back into journaling, review past check-ins, or adjust privacy in settings.
            </p>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Link href="/journal" className="rounded-xl bg-teal-600 px-4 py-3 text-center text-sm font-semibold text-white">
              Write in journal
            </Link>
            <Link href="/check-ins" className="rounded-xl border border-teal-200 px-4 py-3 text-center text-sm font-semibold text-teal-800">
              Mood history
            </Link>
            <Link href="/prompts" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700">
              Guided prompts
            </Link>
            <Link href="/settings" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700">
              Privacy & encryption
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
`,
    },
    {
      path: "app/dashboard/page.tsx",
      content: `import { AppShell } from "@/components/AppShell";
import { MoodCheckInCard } from "@/components/MoodCheckInCard";
import { InsightCards } from "@/components/InsightCards";
import { todayMood } from "@/lib/mental-wellness-data";

export default function DashboardPage() {
  return (
    <AppShell title="Wellness dashboard">
      <p className="text-sm text-slate-600">Your daily overview — mood, prompts, and gentle insights in one place.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <MoodCheckInCard mood={todayMood} />
        <InsightCards compact />
      </div>
    </AppShell>
  );
}
`,
    },
    {
      path: "app/check-ins/page.tsx",
      content: `import { AppShell } from "@/components/AppShell";
import { MoodCheckInCard } from "@/components/MoodCheckInCard";
import { MoodTrendChart } from "@/components/MoodTrendChart";
import { moodHistory, weeklyTrend } from "@/lib/mental-wellness-data";

export default function CheckInsPage() {
  return (
    <AppShell title="Daily mood check-ins">
      <MoodCheckInCard mood={moodHistory[0]} />
      <div className="card mt-6">
        <h2 className="font-semibold">Recent check-ins</h2>
        <ul className="mt-4 space-y-2">
          {moodHistory.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span>{m.label}</span>
              <span className="font-medium text-teal-800">{m.score}/10</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card mt-6">
        <h2 className="mb-3 font-semibold">Weekly trend</h2>
        <MoodTrendChart points={weeklyTrend} />
      </div>
    </AppShell>
  );
}
`,
    },
    {
      path: "app/journal/page.tsx",
      content: `import { AppShell } from "@/components/AppShell";
import { JournalEntryList } from "@/components/JournalEntryList";
import { journalEntries } from "@/lib/mental-wellness-data";

export default function JournalPage() {
  return (
    <AppShell title="Private journal">
      <p className="text-sm text-slate-600">Entries are stored locally in this demo — wire your vault for production.</p>
      <div className="mt-4">
        <JournalEntryList entries={journalEntries} />
      </div>
    </AppShell>
  );
}
`,
    },
    {
      path: "app/prompts/page.tsx",
      content: `import { AppShell } from "@/components/AppShell";
import { GuidedPromptCard } from "@/components/GuidedPromptCard";
import { guidedPrompts } from "@/lib/mental-wellness-data";

export default function PromptsPage() {
  return (
    <AppShell title="Guided prompts">
      <div className="grid gap-4 md:grid-cols-2">
        {guidedPrompts.map((p) => (
          <GuidedPromptCard key={p.id} prompt={p} />
        ))}
      </div>
    </AppShell>
  );
}
`,
    },
    {
      path: "app/insights/page.tsx",
      content: `import { AppShell } from "@/components/AppShell";
import { InsightCards } from "@/components/InsightCards";
import { MoodTrendChart } from "@/components/MoodTrendChart";
import { weeklyTrend, insightSummaries, monthlyMoodSummary } from "@/lib/mental-wellness-data";

export default function InsightsPage() {
  return (
    <AppShell title="Trend insights">
      <p className="text-sm text-slate-600">
        Patterns are computed from your check-ins and journal tags — use them as gentle signals, not judgments.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <div className="card text-center">
          <p className="text-xs text-slate-500">Monthly average</p>
          <p className="text-2xl font-bold">{monthlyMoodSummary.average}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500">Best day</p>
          <p className="text-sm font-semibold">{monthlyMoodSummary.highest.day}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500">Tender day</p>
          <p className="text-sm font-semibold">{monthlyMoodSummary.lowest.day}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-slate-500">Check-ins</p>
          <p className="text-2xl font-bold">{monthlyMoodSummary.checkInsCompleted}</p>
        </div>
      </div>
      <div className="card mt-6">
        <h2 className="mb-3 font-semibold">Seven-day mood rhythm</h2>
        <MoodTrendChart points={weeklyTrend} height={220} />
      </div>
      <ul className="mt-6 space-y-3">
        {insightSummaries.map((s) => (
          <li key={s.id} className="card text-sm leading-relaxed text-slate-700">{s.body}</li>
        ))}
      </ul>
      <div className="mt-6">
        <InsightCards />
      </div>
    </AppShell>
  );
}
`,
    },
    {
      path: "app/private-messages/page.tsx",
      content: `import { AppShell } from "@/components/AppShell";
import { PrivateMessagePanel } from "@/components/PrivateMessagePanel";
import { trustCopy, encryptedThreads } from "@/lib/mental-wellness-data";

export default function PrivateMessagesPage() {
  return (
    <AppShell title="Private encrypted messaging">
      <PrivateMessagePanel trust={trustCopy} threads={encryptedThreads} full />
    </AppShell>
  );
}
`,
    },
    {
      path: "app/settings/page.tsx",
      content: `import { AppShell } from "@/components/AppShell";
import { monthlyMoodSummary, privacySettings, wellnessResources } from "@/lib/mental-wellness-data";

export default function SettingsPage() {
  return (
    <AppShell title="Settings & privacy">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card max-w-lg space-y-4">
          <div>
            <label className="text-sm font-medium">Display name</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" defaultValue="${e}" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked={privacySettings.encryptJournal} className="rounded" />
            End-to-end encrypt new journal entries
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked={privacySettings.encryptMessages} className="rounded" />
            Encrypt private messages at rest
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked={privacySettings.biometricLock} className="rounded" />
            Require biometric lock on mobile
          </label>
          <button type="button" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
            Save preferences
          </button>
        </div>
        <div className="card">
          <h2 className="font-semibold">This month</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-slate-500">Avg mood</dt><dd className="font-semibold">{monthlyMoodSummary.average}/10</dd></div>
            <div><dt className="text-slate-500">Check-ins</dt><dd className="font-semibold">{monthlyMoodSummary.checkInsCompleted}</dd></div>
            <div><dt className="text-slate-500">Journal entries</dt><dd className="font-semibold">{monthlyMoodSummary.journalEntries}</dd></div>
            <div><dt className="text-slate-500">Prompts done</dt><dd className="font-semibold">{monthlyMoodSummary.promptsCompleted}</dd></div>
          </dl>
        </div>
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Wellness resource library</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {wellnessResources.map((r) => (
            <li key={r.id} className="card">
              <p className="text-xs font-semibold uppercase text-teal-700">{r.duration}</p>
              <p className="mt-1 font-semibold">{r.title}</p>
              <p className="mt-2 text-sm text-slate-600">{r.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
`,
    },
    {
      path: "app/help/page.tsx",
      content: `import { AppShell } from "@/components/AppShell";
import { wellnessResources } from "@/lib/mental-wellness-data";
import { WellnessResourceCard } from "@/components/WellnessResourceCard";

const faqs = [
  { q: "Is my journal encrypted?", a: "Yes — entries use end-to-end encryption in production with keys bound to your device." },
  { q: "Can I export my data?", a: "Settings includes export to JSON or PDF for therapy sessions or personal archives." },
  { q: "How are insights calculated?", a: "We aggregate mood scores, check-in times, and journal tags locally before showing trends." },
  { q: "What if I am in crisis?", a: "Use the crisis resources card — this app complements care but is not an emergency service." },
];

export default function HelpPage() {
  return (
    <AppShell title="Help & resources">
      <section className="grid gap-4 md:grid-cols-2">
        {wellnessResources.map((r) => (
          <WellnessResourceCard key={r.id} resource={r} />
        ))}
      </section>
      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-semibold">Frequently asked questions</h2>
        {faqs.map((item) => (
          <details key={item.q} className="card group open:ring-2 open:ring-teal-100">
            <summary className="cursor-pointer font-semibold text-slate-900">{item.q}</summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
          </details>
        ))}
      </section>
    </AppShell>
  );
}
`,
    },
    {
      path: "components/WellnessResourceCard.tsx",
      content: `type Resource = { id: string; title: string; duration: string; description: string };

export function WellnessResourceCard({ resource }: { resource: Resource }) {
  return (
    <article className="card border-teal-100">
      <p className="text-xs font-semibold uppercase text-teal-700">{resource.duration}</p>
      <h3 className="mt-1 font-semibold text-slate-900">{resource.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{resource.description}</p>
      <button type="button" className="mt-4 text-sm font-semibold text-teal-700 hover:underline">
        Start session
      </button>
    </article>
  );
}
`,
    },
    {
      path: "lib/mental-wellness-data.ts",
      content: `export type MoodPoint = { day: string; score: number };
export type MoodEntry = { id: string; label: string; score: number; note: string };
export type GuidedPrompt = { id: string; title: string; body: string; category: string };
export type JournalEntry = { id: string; title: string; excerpt: string; date: string; mood: string };
export type EncryptedThread = { id: string; name: string; lastMessage: string; locked: boolean };

export const todayMood: MoodEntry = {
  id: "today",
  label: "Today",
  score: 7,
  note: "Steady morning — grateful for quiet time before meetings.",
};

export const moodHistory: MoodEntry[] = [
  todayMood,
  { id: "y1", label: "Yesterday", score: 6, note: "Afternoon dip, evening walk helped." },
  { id: "y2", label: "Two days ago", score: 8, note: "Strong focus and connection with a friend." },
  { id: "y3", label: "Three days ago", score: 5, note: "Short sleep; practiced breathing exercises." },
];

export const weeklyTrend: MoodPoint[] = [
  { day: "Mon", score: 6 },
  { day: "Tue", score: 7 },
  { day: "Wed", score: 5 },
  { day: "Thu", score: 8 },
  { day: "Fri", score: 7 },
  { day: "Sat", score: 9 },
  { day: "Sun", score: 7 },
];

export const guidedPrompt: GuidedPrompt = {
  id: "p1",
  title: "What felt supportive today?",
  body: "Name one person, habit, or moment that helped you feel grounded. How might you invite more of it tomorrow?",
  category: "Gratitude",
};

export const guidedPrompts: GuidedPrompt[] = [
  guidedPrompt,
  {
    id: "p2",
    title: "Body scan check-in",
    body: "Starting at your feet, notice tension without judgment. Where can you soften before sleep?",
    category: "Mindfulness",
  },
  {
    id: "p3",
    title: "Reframe a worry",
    body: "Write the concern in one sentence, then list three facts that contradict catastrophic thinking.",
    category: "Cognitive",
  },
];

export const journalEntries: JournalEntry[] = [
  { id: "j1", title: "Morning clarity", excerpt: "Woke early and journaled before email. Noticed tension in shoulders before it became a headache.", date: "Today", mood: "Calm" },
  { id: "j2", title: "Boundary practice", excerpt: "Said no to a late meeting — proud of that. Reminded myself rest is productive.", date: "Yesterday", mood: "Empowered" },
  { id: "j3", title: "Rainy walk", excerpt: "Ten minutes outside shifted my energy. Grateful for small rituals.", date: "Mar 16", mood: "Renewed" },
  { id: "j4", title: "Anxiety wave", excerpt: "Used box breathing when the spiral started. It passed faster than last week.", date: "Mar 15", mood: "Steady" },
  { id: "j5", title: "Connection", excerpt: "Called a friend instead of scrolling. Felt less alone afterward.", date: "Mar 14", mood: "Warm" },
  { id: "j6", title: "Sleep note", excerpt: "Stopped caffeine after 2pm — slept through the night for the first time in days.", date: "Mar 13", mood: "Rested" },
];

export const insightSummaries = [
  { id: "i1", body: "Your mood scores rose 12% on days with a morning check-in before 9am." },
  { id: "i2", body: "Evening journaling correlates with +0.8 higher next-day mood on average." },
  { id: "i3", body: "Social connection tags appear in 4 of your last 5 high-mood entries." },
];

export const trustCopy = {
  title: "Encryption you can trust",
  body: "Messages use end-to-end encryption in transit and at rest. Keys never leave your device in production mode.",
  badge: "AES-256 + sealed sender",
};

export const encryptedThreads: EncryptedThread[] = [
  { id: "t1", name: "Therapist (Dr. Lee)", lastMessage: "See you Thursday — remember grounding exercise", locked: true },
  { id: "t2", name: "Trusted peer — Sam", lastMessage: "Thank you for sharing. Here when you need.", locked: true },
  { id: "t3", name: "Crisis line (saved)", lastMessage: "Resources pinned — tap only if you need immediate help", locked: true },
];

export const wellnessResources = [
  { id: "r1", title: "5-minute grounding", duration: "5 min", description: "Box breathing, sensory scan, and gentle neck release." },
  { id: "r2", title: "Sleep wind-down", duration: "12 min", description: "Dim lights ritual, journal prompt, and progressive relaxation." },
  { id: "r3", title: "Compassion break", duration: "8 min", description: "Self-kindness phrases when your inner critic is loud." },
  { id: "r4", title: "Movement snack", duration: "6 min", description: "Desk stretches and a short walk template for mood lifts." },
];

export const monthlyMoodSummary = {
  average: 6.8,
  highest: { day: "Saturday", score: 9 },
  lowest: { day: "Wednesday", score: 5 },
  checkInsCompleted: 22,
  journalEntries: 14,
  promptsCompleted: 9,
};

export const privacySettings = {
  encryptJournal: true,
  encryptMessages: true,
  biometricLock: true,
  shareInsightsWithCoach: false,
  anonymousAnalytics: true,
};
`,
    },
    {
      path: "components/AppShell.tsx",
      content: `import type { ReactNode } from "react";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      </header>
      {children}
    </section>
  );
}
`,
    },
    {
      path: "components/MoodCheckInCard.tsx",
      content: `import type { MoodEntry } from "@/lib/mental-wellness-data";

const MOOD_COLORS = ["bg-rose-100 text-rose-800", "bg-amber-100 text-amber-800", "bg-teal-100 text-teal-800", "bg-emerald-100 text-emerald-800"];

export function MoodCheckInCard({ mood }: { mood: MoodEntry }) {
  const tone = mood.score >= 8 ? MOOD_COLORS[3] : mood.score >= 6 ? MOOD_COLORS[2] : mood.score >= 4 ? MOOD_COLORS[1] : MOOD_COLORS[0];
  return (
    <article className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Today&apos;s mood check-in</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold tabular-nums text-slate-900">{mood.score}<span className="text-lg text-slate-500">/10</span></p>
          <p className="mt-1 text-sm text-slate-600">{mood.label}</p>
        </div>
        <span className={"mood-pill " + tone}>{mood.score >= 7 ? "Balanced" : mood.score >= 5 ? "Managing" : "Tender"}</span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-700">{mood.note}</p>
      <button type="button" className="mt-4 w-full rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white">
        Log another check-in
      </button>
    </article>
  );
}
`,
    },
    {
      path: "components/MoodTrendChart.tsx",
      content: `import type { MoodPoint } from "@/lib/mental-wellness-data";

export function MoodTrendChart({ points, height = 160 }: { points: MoodPoint[]; height?: number }) {
  const max = 10;
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {points.map((p) => (
        <div key={p.day} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-300"
            style={{ height: Math.max(12, (p.score / max) * (height - 32)) }}
            title={p.day + ": " + p.score + "/10"}
          />
          <span className="text-[10px] font-medium text-slate-500">{p.day}</span>
        </div>
      ))}
    </div>
  );
}
`,
    },
    {
      path: "components/GuidedPromptCard.tsx",
      content: `import type { GuidedPrompt } from "@/lib/mental-wellness-data";

export function GuidedPromptCard({ prompt }: { prompt: GuidedPrompt }) {
  return (
    <article className="card border-violet-100">
      <span className="text-xs font-semibold uppercase text-violet-600">{prompt.category}</span>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">{prompt.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{prompt.body}</p>
      <button type="button" className="mt-4 rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-800">
        Start reflection
      </button>
    </article>
  );
}
`,
    },
    {
      path: "components/JournalEntryList.tsx",
      content: `import type { JournalEntry } from "@/lib/mental-wellness-data";

export function JournalEntryList({ entries }: { entries: JournalEntry[] }) {
  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="card hover:ring-2 hover:ring-teal-100">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{entry.title}</h3>
            <span className="text-xs text-slate-500">{entry.date}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{entry.excerpt}</p>
          <span className="mt-3 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">{entry.mood}</span>
        </li>
      ))}
    </ul>
  );
}
`,
    },
    {
      path: "components/PrivateMessagePanel.tsx",
      content: `import type { EncryptedThread } from "@/lib/mental-wellness-data";

type Trust = { title: string; body: string; badge: string };

export function PrivateMessagePanel({
  trust,
  threads = [],
  full = false,
}: {
  trust: Trust;
  threads?: EncryptedThread[];
  full?: boolean;
}) {
  return (
    <article className="card border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">E2E</span>
        <h2 className="text-lg font-semibold text-indigo-950">{trust.title}</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">{trust.body}</p>
      <p className="mt-2 text-xs font-medium text-indigo-700">{trust.badge}</p>
      {(full || threads.length > 0) && (
        <ul className="mt-4 space-y-2">
          {threads.map((t) => (
            <li key={t.id} className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm">
              <p className="font-medium text-slate-900">{t.name} {t.locked ? "🔒" : ""}</p>
              <p className="text-xs text-slate-500">{t.lastMessage}</p>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
        Open secure inbox
      </button>
    </article>
  );
}
`,
    },
    {
      path: "components/InsightCards.tsx",
      content: `import { insightSummaries } from "@/lib/mental-wellness-data";

export function InsightCards({ compact = false }: { compact?: boolean }) {
  const items = compact ? insightSummaries.slice(0, 2) : insightSummaries;
  return (
    <section className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 md:grid-cols-3"}>
      {items.map((s) => (
        <article key={s.id} className="card bg-gradient-to-br from-violet-50 to-white">
          <p className="text-xs font-semibold uppercase text-violet-600">Insight</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{s.body}</p>
        </article>
      ))}
    </section>
  );
}
`,
    },
    {
      path: "lib/wellness-copy.ts",
      content: `/** User-facing copy blocks for empty states and onboarding banners. */
export const onboardingBanner = {
  title: "Welcome to your wellness journal",
  body: "Start with a two-minute mood check-in. Your data stays private, encrypted, and under your control.",
  cta: "Begin check-in",
};

export const emptyJournalCopy =
  "No entries yet. Write a few sentences about today — future you will appreciate the context when reviewing trends.";

export const emptyCheckInCopy =
  "You have not logged a mood today. A quick 1–10 rating helps the insights page show meaningful patterns over time.";

export const encryptionExplainer =
  "DreamOS86 uses modern encryption for journals and messages. Keys are generated on your device; our servers store ciphertext only.";

export const crisisDisclaimer =
  "If you are in immediate danger, contact local emergency services. This application is not a substitute for professional crisis intervention.";

export const insightDisclaimer =
  "Insights highlight correlations in your own data. They are not medical advice and should not be used to diagnose or treat conditions.";

export const checkInScaleLabels = [
  "1 — Overwhelmed",
  "2 — Very low",
  "3 — Low",
  "4 — Below neutral",
  "5 — Neutral",
  "6 — Slightly positive",
  "7 — Balanced",
  "8 — Good",
  "9 — Very good",
  "10 — Excellent",
];

export const journalPromptSeeds = [
  "What emotion is most present right now, and where do you feel it in your body?",
  "What is one thing you can control today, and one thing you can release?",
  "Who or what helped you feel even 1% safer this week?",
  "If your mood were weather, what would the forecast say — and what might shift it one degree?",
  "Write a letter to yourself from last month — what compassion would you offer?",
];
`,
    },
    {
      path: "package.json",
      content: `{
  "name": "${e.toLowerCase().replace(/\s+/g, "-")}",
  "private": true,
  "version": "0.1.0",
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": { "next": "15.1.0", "react": "^19.0.0", "react-dom": "^19.0.0" },
  "devDependencies": { "typescript": "^5.7.0", "@types/react": "^19.0.0", "tailwindcss": "^3.4.0" }
}
`,
    },
  ];

  return files.map((f) => ({ ...f, path: normalizeBuildFilePath(f.path) }));
}

export function mergeMentalWellnessScaffold(files: BuildFile[], appName: string): BuildFile[] {
  const scaffold = mentalWellnessScaffoldFiles(appName);
  const byPath = new Map<string, BuildFile>();
  for (const f of scaffold) byPath.set(f.path, f);
  let filesReplaced = 0;
  for (const f of files) {
    const path = normalizeBuildFilePath(f.path);
    if (!path || !f.content?.trim()) continue;
    if (shouldReplaceWithScaffold(path, f.content)) {
      if (byPath.has(path)) filesReplaced += 1;
      continue;
    }
    byPath.set(path, { path, content: f.content });
  }
  if (process.env.NODE_ENV !== "production" && filesReplaced > 0) {
    console.info("[build] mental_wellness_scaffold_merge", { filesReplaced });
  }
  return [...byPath.values()];
}
