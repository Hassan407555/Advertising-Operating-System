import { cn } from "@/lib/utils";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        [
          "flex min-h-24 w-full rounded-[var(--radius-md)] bg-input/40",
          "border border-border/60 shadow-[var(--shadow-xs)]",
          "px-3 py-2 text-sm text-foreground",
          "outline-none transition-surface resize-y",
          "placeholder:text-muted-foreground/80",
          "hover:border-border",
          "focus-visible:border-primary/50 focus-visible:shadow-[var(--shadow-focus)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]",
        ].join(" "),
        className,
      )}
      {...props}
    />
  );
}
