import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function PageError({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: PageErrorProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] bg-destructive-muted/50 p-5 shadow-[var(--shadow-card)]",
        "ring-1 ring-destructive/25",
        className,
      )}
      role="alert"
    >
      <h2 className="text-subheading">{title}</h2>
      <p className="mt-1.5 text-body-sm">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
