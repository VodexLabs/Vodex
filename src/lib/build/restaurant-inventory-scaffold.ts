import type { BuildFile } from "@/lib/build/generated-file-utils";
import { normalizeBuildFilePath } from "@/lib/build/generated-file-utils";

/** Premium restaurant inventory baseline — merged under LLM output for standard builds. */
export function restaurantInventoryScaffoldFiles(): BuildFile[] {
  return [
    {
      path: "package.json",
      content: `{
  "name": "pantry-pro-inventory",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": { "next": "^15.0.0", "react": "^19.0.0", "react-dom": "^19.0.0" }
}
`,
    },
    {
      path: "app/globals.css",
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand: #ea580c;
  --brand-muted: #fff7ed;
  --surface: #ffffff;
  --border: #e7e5e4;
}

body {
  @apply bg-stone-50 text-stone-900 antialiased;
}

.card {
  @apply rounded-xl border border-stone-200 bg-white shadow-sm;
}
`,
    },
    {
      path: "lib/mock-data.ts",
      content: `export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  supplier: string;
  expiry: string;
  par: number;
  costPerUnit: number;
};

export const inventory: InventoryItem[] = [
  { id: "1", name: "Atlantic Salmon", category: "Protein", quantity: 12, unit: "kg", supplier: "Harbor Fish Co.", expiry: "2026-05-28", par: 15, costPerUnit: 18.5 },
  { id: "2", name: "Olive Oil — Extra Virgin", category: "Pantry", quantity: 8, unit: "L", supplier: "Mediterranean Direct", expiry: "2027-01-15", par: 10, costPerUnit: 12 },
  { id: "3", name: "Heirloom Tomatoes", category: "Produce", quantity: 6, unit: "kg", supplier: "Green Valley Farms", expiry: "2026-05-24", par: 12, costPerUnit: 4.2 },
  { id: "4", name: "Heavy Cream", category: "Dairy", quantity: 4, unit: "L", supplier: "Dairy Fresh", expiry: "2026-05-23", par: 8, costPerUnit: 5.8 },
  { id: "5", name: "Basmati Rice", category: "Dry Goods", quantity: 22, unit: "kg", supplier: "GrainWorks", expiry: "2026-11-01", par: 20, costPerUnit: 2.1 },
];

export const suppliers = [
  { id: "s1", name: "Harbor Fish Co.", leadDays: 1, rating: 4.8, activeOrders: 2 },
  { id: "s2", name: "Green Valley Farms", leadDays: 2, rating: 4.6, activeOrders: 1 },
  { id: "s3", name: "Mediterranean Direct", leadDays: 3, rating: 4.9, activeOrders: 0 },
];

export const alerts = [
  { id: "a1", severity: "high", message: "Heavy Cream below par — reorder today", item: "Heavy Cream" },
  { id: "a2", severity: "medium", message: "Heirloom Tomatoes expiring in 2 days", item: "Heirloom Tomatoes" },
  { id: "a3", severity: "low", message: "Basmati Rice usage up 18% this week", item: "Basmati Rice" },
];

export const costInsights = {
  weeklySpend: 4280,
  wastePercent: 3.2,
  topCategory: "Protein",
  savingsOpportunity: 340,
};
`,
    },
    {
      path: "components/AppShell.tsx",
      content: `"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/alerts", label: "Alerts" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-stone-200 bg-white md:flex md:flex-col">
        <div className="border-b border-stone-200 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">Pantry Pro</p>
          <p className="text-sm font-semibold text-stone-900">Restaurant Inventory</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700"
                    : "rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
`,
    },
    {
      path: "components/MetricCard.tsx",
      content: `export function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-stone-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}
`,
    },
    {
      path: "components/InventoryTable.tsx",
      content: `"use client";

import React from "react";
import { inventory, type InventoryItem } from "@/lib/mock-data";

export function InventoryTable({ rows = inventory }: { rows?: InventoryItem[] }) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string | "all">("all");
  const filtered = rows.filter((r) => {
    const matchesQuery =
      !query || r.name.toLowerCase().includes(query.toLowerCase()) || r.category.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || r.category === category;
    return matchesQuery && matchesCategory;
  });
  const empty = filtered.length === 0;
  return (
    <div className="card overflow-hidden" data-testid="inventory-table">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-stone-900">Stock on hand</h2>
        <input
          type="search"
          placeholder="Filter by name or category…"
          className="rounded-lg border border-stone-200 px-2 py-1 text-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex gap-2 border-b border-stone-100 px-4 py-2">
        {["all", "Protein", "Produce", "Dairy", "Pantry"].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={category === c ? "rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800" : "text-xs text-stone-600"}
          >
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-2">Item</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Qty</th>
            <th className="px-4 py-2">Supplier</th>
            <th className="px-4 py-2">Expiry</th>
          </tr>
        </thead>
        <tbody>
          {empty ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-stone-500">
                No items match your filters — empty inventory view. Clear filters to reload stock data.
              </td>
            </tr>
          ) : null}
          {filtered.map((row) => (
            <tr key={row.id} className="border-t border-stone-100">
              <td className="px-4 py-2 font-medium">{row.name}</td>
              <td className="px-4 py-2">{row.category}</td>
              <td className="px-4 py-2 tabular-nums">
                {row.quantity} {row.unit}
                {row.quantity < row.par ? (
                  <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">Low</span>
                ) : null}
              </td>
              <td className="px-4 py-2">{row.supplier}</td>
              <td className="px-4 py-2 tabular-nums">{row.expiry}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`,
    },
    {
      path: "components/LowStockAlerts.tsx",
      content: `import { alerts } from "@/lib/mock-data";

export function LowStockAlerts() {
  if (!alerts.length) {
    return (
      <div className="card p-4">
        <p className="text-sm text-stone-500">No alerts right now — inventory levels look healthy.</p>
      </div>
    );
  }
  return (
    <div className="card p-4" data-testid="low-stock-alerts">
      <h2 className="text-sm font-semibold text-stone-900">Low stock & expiry alerts</h2>
      <ul className="mt-3 space-y-2">
        {alerts.map((a) => (
          <li key={a.id} className="flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
            <span
              className={
                a.severity === "high"
                  ? "mt-0.5 size-2 rounded-full bg-red-500"
                  : a.severity === "medium"
                    ? "mt-0.5 size-2 rounded-full bg-amber-500"
                    : "mt-0.5 size-2 rounded-full bg-stone-400"
              }
            />
            <div>
              <p className="font-medium text-stone-900">{a.item}</p>
              <p className="text-xs text-stone-600">{a.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
`,
    },
    {
      path: "components/SupplierList.tsx",
      content: `import { suppliers } from "@/lib/mock-data";

export function SupplierList() {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-stone-900">Suppliers</h2>
      <ul className="mt-3 divide-y divide-stone-100">
        {suppliers.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-3 text-sm">
            <div>
              <p className="font-medium text-stone-900">{s.name}</p>
              <p className="text-xs text-stone-500">{s.leadDays} day lead · {s.activeOrders} open orders</p>
            </div>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">{s.rating}★</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
`,
    },
    {
      path: "components/ExpiryTimeline.tsx",
      content: `import { inventory } from "@/lib/mock-data";

export function ExpiryTimeline() {
  const soon = [...inventory].sort((a, b) => a.expiry.localeCompare(b.expiry)).slice(0, 4);
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-stone-900">Expiring soon</h2>
      <ol className="mt-3 space-y-2 border-l-2 border-orange-200 pl-4">
        {soon.map((item) => (
          <li key={item.id} className="text-sm">
            <p className="font-medium text-stone-900">{item.name}</p>
            <p className="text-xs text-stone-500">Expires {item.expiry}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
`,
    },
    {
      path: "components/CostInsights.tsx",
      content: `import { costInsights } from "@/lib/mock-data";

export function CostInsights() {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-stone-900">Cost insights</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-stone-500">Weekly spend</dt>
          <dd className="font-semibold tabular-nums">\${costInsights.weeklySpend.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Waste</dt>
          <dd className="font-semibold tabular-nums">{costInsights.wastePercent}%</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Top category</dt>
          <dd className="font-semibold">{costInsights.topCategory}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Savings opportunity</dt>
          <dd className="font-semibold tabular-nums text-green-700">\${costInsights.savingsOpportunity}</dd>
        </div>
      </dl>
    </div>
  );
}
`,
    },
    {
      path: "app/layout.tsx",
      content: `import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata = { title: "Pantry Pro — Restaurant Inventory" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
`,
    },
    {
      path: "app/page.tsx",
      content: `import { MetricCard } from "@/components/MetricCard";
import { InventoryTable } from "@/components/InventoryTable";
import { LowStockAlerts } from "@/components/LowStockAlerts";
import { CostInsights } from "@/components/CostInsights";
import { inventory } from "@/lib/mock-data";

export default function DashboardPage() {
  const lowStock = inventory.filter((i) => i.quantity < i.par).length;
  const totalSkus = inventory.length;
  return (
    <div className="space-y-6 p-6" data-testid="restaurant-dashboard">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Inventory dashboard</h1>
        <p className="mt-1 text-sm text-stone-600">Track ingredients, suppliers, expiry, and costs in one place.</p>
        <p className="sr-only" aria-live="polite">Loading stock metrics…</p>
      </header>
      <div className="mb-2 h-1 w-full overflow-hidden rounded bg-stone-100" aria-hidden>
        <div className="h-full w-1/3 animate-pulse bg-orange-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="SKUs tracked" value={String(totalSkus)} hint="Active ingredients" />
        <MetricCard label="Low stock" value={String(lowStock)} hint="Below par level" />
        <MetricCard label="Open alerts" value="3" hint="Needs attention today" />
        <MetricCard label="Weekly spend" value="$4,280" hint="vs last week −4%" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InventoryTable />
        </div>
        <div className="space-y-4">
          <LowStockAlerts />
          <CostInsights />
        </div>
      </div>
    </div>
  );
}
`,
    },
    {
      path: "app/inventory/page.tsx",
      content: `import { InventoryTable } from "@/components/InventoryTable";

export default function InventoryPage() {
  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900">Inventory</h1>
        <p className="text-sm text-stone-600">Full stock list with filters and par levels.</p>
      </header>
      <InventoryTable />
    </div>
  );
}
`,
    },
    {
      path: "app/suppliers/page.tsx",
      content: `import { SupplierList } from "@/components/SupplierList";

export default function SuppliersPage() {
  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900">Suppliers</h1>
        <p className="text-sm text-stone-600">Manage vendor relationships and open purchase orders.</p>
      </header>
      <SupplierList />
    </div>
  );
}
`,
    },
    {
      path: "app/alerts/page.tsx",
      content: `import { LowStockAlerts } from "@/components/LowStockAlerts";
import { ExpiryTimeline } from "@/components/ExpiryTimeline";

export default function AlertsPage() {
  return (
    <div className="grid gap-4 p-6 lg:grid-cols-2">
      <header className="lg:col-span-2">
        <h1 className="text-2xl font-semibold text-stone-900">Alerts</h1>
        <p className="text-sm text-stone-600">Low stock, expiry risk, and usage anomalies.</p>
      </header>
      <LowStockAlerts />
      <ExpiryTimeline />
    </div>
  );
}
`,
    },
    {
      path: "app/settings/page.tsx",
      content: `export default function SettingsPage() {
  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900">Settings</h1>
        <p className="text-sm text-stone-600">Units, par defaults, and notification preferences.</p>
      </header>
      <form className="card max-w-lg space-y-4 p-4">
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Restaurant name</span>
          <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" defaultValue="Pantry Pro Bistro" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Low stock email</span>
          <input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" type="email" defaultValue="owner@pantrypro.test" />
        </label>
        <button type="button" className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Save preferences</button>
      </form>
    </div>
  );
}
`,
    },
  ];
}

const SCAFFOLD_LOCKED_PATHS = new Set(
  [
    "package.json",
    "app/layout.tsx",
    "app/page.tsx",
    "app/globals.css",
    "lib/mock-data.ts",
    "components/AppShell.tsx",
    "components/MetricCard.tsx",
    "components/InventoryTable.tsx",
    "components/LowStockAlerts.tsx",
    "components/SupplierList.tsx",
    "components/ExpiryTimeline.tsx",
    "components/CostInsights.tsx",
    "app/inventory/page.tsx",
    "app/suppliers/page.tsx",
    "app/alerts/page.tsx",
    "app/settings/page.tsx",
  ].map(normalizeBuildFilePath),
);

function isScaffoldLocked(path: string): boolean {
  const p = normalizeBuildFilePath(path);
  if (SCAFFOLD_LOCKED_PATHS.has(p)) return true;
  return p.startsWith("components/") && (p.endsWith(".tsx") || p.endsWith(".jsx"));
}

/** Scaffold base — LLM may add extra files but cannot replace locked premium shell/pages. */
export function mergeRestaurantInventoryScaffold(files: BuildFile[]): BuildFile[] {
  const byPath = new Map<string, BuildFile>();
  for (const f of restaurantInventoryScaffoldFiles()) {
    byPath.set(normalizeBuildFilePath(f.path), { ...f, path: normalizeBuildFilePath(f.path) });
  }
  for (const f of files) {
    const p = normalizeBuildFilePath(f.path);
    if (isScaffoldLocked(p)) continue;
    if (f.content.trim().length > 80) {
      byPath.set(p, { ...f, path: p });
    }
  }
  return [...byPath.values()];
}
