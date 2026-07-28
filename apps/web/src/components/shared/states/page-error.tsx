import { Button } from "@/components/ui/button";

interface PageErrorProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function PageError({ title = "Something went wrong", message, onRetry }: PageErrorProps) {
  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
      role="alert"
    >
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
