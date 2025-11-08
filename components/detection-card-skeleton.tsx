import { Skeleton } from "@/components/ui/skeleton";

export function DetectionCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-4 p-4">
        {/* Avatar skeleton */}
        <Skeleton className="size-10 shrink-0 rounded-full" />

        {/* Content skeleton */}
        <div className="flex flex-col md:flex-row w-full md:items-center">
          <div className="flex md:flex-1 gap-2 items-center">
            <Skeleton className="h-5 w-24" />
            <span className="text-muted-foreground">vs</span>
            <Skeleton className="h-5 w-24" />
          </div>

          {/* Metadata skeleton */}
          <div className="md:items-end flex shrink-0 flex-row md:flex-col gap-3 md:gap-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DetectionCardSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <DetectionCardSkeleton key={i} />
      ))}
    </div>
  );
}