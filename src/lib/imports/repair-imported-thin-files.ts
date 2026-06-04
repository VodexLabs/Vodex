import type { BuildFile } from "@/lib/build/generated-file-utils";
import { normalizeBuildFilePath } from "@/lib/build/generated-file-utils";
import { isThinGeneratedFile } from "@/lib/build/meaningful-file-guard";
import type { ZipImportFile } from "@/lib/import/zip-file-validator";

function inferUiHints(files: BuildFile[]): {
  shell: string;
  card: string;
  muted: string;
  accent: string;
  appName: string;
} {
  const sample = files
    .filter((f) => !isThinGeneratedFile(f) && (f.content?.length ?? 0) > 200)
    .slice(0, 12)
    .map((f) => f.content)
    .join("\n");

  const shell =
    sample.match(/className=["']([^"']*min-h-screen[^"']*)["']/)?.[1] ??
    "min-h-screen bg-background text-foreground";
  const card =
    sample.match(/className=["']([^"']*rounded[^"']*border[^"']*)["']/)?.[1] ??
    "rounded-xl border border-border bg-card shadow-sm";
  const muted = sample.includes("text-muted-foreground")
    ? "text-muted-foreground"
    : "text-gray-500 dark:text-gray-400";
  const accent = sample.includes("text-primary")
    ? "text-primary"
    : "text-blue-600 dark:text-blue-400";

  const title =
    sample.match(/<h1[^>]*>([^<]{2,40})</)?.[1]?.trim() ??
    sample.match(/title:\s*["']([^"']+)["']/)?.[1] ??
    "App";

  return { shell, card, muted, accent, appName: title };
}

function layoutJsx(h: ReturnType<typeof inferUiHints>): string {
  return `import { Outlet, Link } from "react-router-dom";

export default function Layout() {
  return (
    <div className="${h.shell}">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">
            ${h.appName}
          </Link>
          <nav className="flex items-center gap-3 text-xs font-medium ${h.muted}">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <Link to="/shop" className="hover:text-foreground">Shop</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-border/60 py-4 text-center text-[11px] ${h.muted}">
        © {new Date().getFullYear()} ${h.appName}
      </footer>
    </div>
  );
}
`;
}

function bannedPageJsx(h: ReturnType<typeof inferUiHints>): string {
  return `import { Link } from "react-router-dom";

export default function BannedPage() {
  return (
    <section className="${h.card} mx-auto max-w-lg p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Access restricted</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Account suspended</h1>
      <p className="mt-2 text-sm ${h.muted}">
        This account cannot access ${h.appName} right now. Contact support if you believe this is a mistake.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          to="/"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Return home
        </Link>
        <a href="mailto:support@example.com" className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium">
          Contact support
        </a>
      </div>
    </section>
  );
}
`;
}

function shopCategoryPageJsx(h: ReturnType<typeof inferUiHints>): string {
  return `import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";

const SAMPLE_ITEMS = [
  { id: "1", name: "House blend", price: "$12", tag: "Popular" },
  { id: "2", name: "Seasonal roast", price: "$14", tag: "New" },
  { id: "3", name: "Cold brew kit", price: "$18", tag: "Bundle" },
];

export default function ShopCategoryPage() {
  const params = useParams();
  const slug = params?.slug ?? params?.category ?? "all";
  const title = useMemo(
    () => slug.replace(/-/g, " ").replace(/\\b\\w/g, (c) => c.toUpperCase()),
    [slug],
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider ${h.muted}">Shop</p>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm ${h.muted}">Browse items in this category. Connect your catalog API to load live products.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_ITEMS.map((item) => (
          <article key={item.id} className="${h.card} p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">{item.name}</h2>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium ${h.accent}">
                {item.tag}
              </span>
            </div>
            <p className="mt-2 text-lg font-semibold tabular-nums">{item.price}</p>
            <Link to={\`/shop/\${slug}/\${item.id}\`} className="mt-3 inline-block text-xs font-medium ${h.accent} hover:underline">
              View details
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
`;
}

function timeoutPageJsx(h: ReturnType<typeof inferUiHints>): string {
  return `import { Link } from "react-router-dom";

export default function TimeoutPage() {
  return (
    <section className="${h.card} mx-auto max-w-lg p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider ${h.accent}">Session expired</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Please sign in again</h1>
      <p className="mt-2 text-sm ${h.muted}">
        Your session timed out for security. Sign back in to continue using ${h.appName}.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          to="/login"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Sign in
        </Link>
        <Link to="/" className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium">
          Go home
        </Link>
      </div>
    </section>
  );
}
`;
}

const TARGET_REPAIRS: Array<{
  match: RegExp;
  build: (h: ReturnType<typeof inferUiHints>) => string;
}> = [
  { match: /(^|\/)src\/Layout\.(jsx|tsx)$/i, build: layoutJsx },
  { match: /(^|\/)src\/pages\/BannedPage\.(jsx|tsx)$/i, build: bannedPageJsx },
  { match: /(^|\/)src\/pages\/ShopCategoryPage\.(jsx|tsx)$/i, build: shopCategoryPageJsx },
  { match: /(^|\/)src\/pages\/TimeoutPage\.(jsx|tsx)$/i, build: timeoutPageJsx },
];

function isRepairCandidate(file: BuildFile): boolean {
  const path = normalizeBuildFilePath(file.path);
  if (!TARGET_REPAIRS.some((t) => t.match.test(path))) return false;
  const content = (file.content ?? "").trim();
  if (!content) return true;
  return isThinGeneratedFile(file);
}

/** Replace known empty/thin imported shells with renderable React UI. */
export function repairImportedThinFiles(
  rawFiles: ZipImportFile[] | BuildFile[],
): { files: ZipImportFile[]; repairedPaths: string[] } {
  const files: ZipImportFile[] = rawFiles.map((f) => ({
    path: normalizeBuildFilePath(f.path),
    content: f.content ?? "",
    sizeBytes: "sizeBytes" in f && typeof f.sizeBytes === "number"
      ? f.sizeBytes
      : Buffer.byteLength(f.content ?? "", "utf8"),
  }));

  const buildFiles: BuildFile[] = files.map((f) => ({ path: f.path, content: f.content }));
  const hints = inferUiHints(buildFiles);
  const repairedPaths: string[] = [];

  for (const file of files) {
    const path = normalizeBuildFilePath(file.path);
    if (!isRepairCandidate({ path, content: file.content })) continue;
    const rule = TARGET_REPAIRS.find((t) => t.match.test(path));
    if (!rule) continue;
    file.content = rule.build(hints);
    file.sizeBytes = Buffer.byteLength(file.content, "utf8");
    repairedPaths.push(path);
  }

  return { files, repairedPaths };
}
