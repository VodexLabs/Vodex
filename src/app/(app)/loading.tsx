import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[20%] top-[-18%] h-[520px] w-[520px] rounded-full bg-muted/40 blur-2xl" />
        <div className="absolute right-[-12%] top-[8%] h-[420px] w-[420px] rounded-full bg-muted/35 blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <Skeleton className="mx-auto h-3 w-24" />
          <Skeleton className="mx-auto mt-5 h-10 w-[92%] max-w-xl" />
          <Skeleton className="mx-auto mt-4 h-4 w-[88%] max-w-2xl" />
          <Skeleton className="mx-auto mt-3 h-4 w-[72%] max-w-xl" />
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <div className="rounded-[var(--radius-xl)] bg-surface/60 p-2 shadow-[var(--shadow-md)] ring-1 ring-border">
            <Skeleton className="h-[140px] w-full rounded-[calc(var(--radius-xl)-6px)]" />
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex gap-2">
                <Skeleton className="size-9 rounded-[var(--radius-md)]" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
              <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-44 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-16 max-w-6xl px-4 sm:px-0">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-8 w-64" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[var(--radius-lg)] bg-surface ring-1 ring-border"
            >
              <Skeleton className="h-36 w-full" />
              <div className="space-y-3 px-5 py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
