import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface PageLoadingProps {
  cards?: number;
}

export function PageLoading({ cards = 2 }: PageLoadingProps) {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: cards }).map((_, index) => (
          <Card key={index} className="space-y-3 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
