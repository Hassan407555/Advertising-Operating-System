import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PageLoadingProps {
  cards?: number;
  className?: string;
}

export function PageLoading({ cards = 2, className }: PageLoadingProps) {
  return (
    <div
      className={cn("page-stack animate-fade-in", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: cards }).map((_, index) => (
          <Card key={index} className="space-y-4" padding="default">
            <Skeleton className="h-4 w-32" />
            <Skeleton variant="shimmer" className="h-28 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, className }: TableSkeletonProps) {
  return (
    <Card padding="none" className={cn("overflow-hidden", className)}>
      <div className="border-b border-border/50 bg-muted/30 px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
