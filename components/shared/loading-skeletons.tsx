import { Skeleton } from "@/components/ui/skeleton";

type FeedSkeletonProps = {
  count?: number;
};

export function FeedSkeleton({ count = 3 }: FeedSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex gap-3">
            <Skeleton className="h-14 w-10 rounded-lg" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type AgentGridSkeletonProps = {
  count?: number;
};

export function AgentGridSkeleton({ count = 6 }: AgentGridSkeletonProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
          <Skeleton className="mt-4 h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
