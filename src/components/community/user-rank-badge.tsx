import { cn } from "@/lib/utils";
import { rankLabelForId } from "@/lib/community/user-ranks";

export function UserRankBadge({
  rankId,
  className,
}: {
  rankId?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-gradient-to-r from-blue-500/15 to-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-500/25 dark:text-blue-300",
        className,
      )}
    >
      {rankLabelForId(rankId)}
    </span>
  );
}
