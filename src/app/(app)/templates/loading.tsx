import { Skeleton } from "@/components/ui/skeleton";

export default function TemplatesLoading() {
  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      {/* Subtle bg orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[15%] top-[-12%] h-[500px] w-[500px] rounded-full bg-muted/40 blur-3xl" />
        <div className="absolute right-[-10%] top-[6%] h-[420px] w-[420px] rounded-full bg-muted/35 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {/* Header skeleton */}
        <div className="mb-10 max-w-3xl space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-[85%] max-w-lg" />
          <Skeleton className="h-4 w-[72%] max-w-md" />
          <Skeleton className="h-4 w-[58%] max-w-sm" />
        </div>

        {/* Search + pill filters */}
        <div className="mb-10 space-y-4">
          <Skeleton className="h-10 w-full max-w-md rounded-[var(--radius-md)]" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 11 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-8 rounded-full"
                style={{ width: `${56 + (i % 4) * 14}px` }}
              />
            ))}
          </div>
        </div>

        {/* Section label */}
        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="size-4 rounded-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>

        {/* Cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[var(--radius-xl)] bg-surface ring-1 ring-border shadow-[var(--shadow-card)]"
            >
              <Skeleton className="h-40 w-full rounded-none" />
              <div className="space-y-3 px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[80%]" />
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-8 w-full rounded-[var(--radius-sm)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
