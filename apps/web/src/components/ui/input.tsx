import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary",
        className,
      )}
      {...props}
    />
  );
}
