import { Skeleton } from "@/components/ui/skeleton";

export default function AppsLoading() {
  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-muted/40 blur-3xl" />

      <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-[var(--radius-md)]" />
      </div>

      <div className="relative mt-12 space-y-5">
        <div className="overflow-hidden rounded-[var(--radius-xl)] ring-1 ring-border">
          <Skeleton className="h-[260px] w-full" />
          <div className="space-y-3 bg-surface/80 p-6">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <div className="flex justify-between pt-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[var(--radius-xl)] ring-1 ring-border"
            >
              <Skeleton className="h-44 w-full" />
              <div className="space-y-3 bg-surface/80 p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
