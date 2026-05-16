import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-glass)] ring-1 ring-border overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className={i === 0 ? "h-1.5 w-6 rounded-full" : "h-1.5 w-2 rounded-full"} />
            ))}
            <Skeleton className="h-3 w-12 ml-1 rounded" />
          </div>
          <Skeleton className="h-3 w-16 rounded" />
        </div>

        {/* Content */}
        <div className="px-8 py-10 flex flex-col items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-[var(--radius-xl)]" />
          <div className="flex flex-col items-center gap-3 w-full">
            <Skeleton className="h-7 w-64 rounded-[var(--radius-md)]" />
            <Skeleton className="h-4 w-48 rounded-[var(--radius-sm)]" />
          </div>
          <div className="flex items-center gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-28 rounded" />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-8 pb-6">
          <Skeleton className="h-10 w-36 rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
  );
}
