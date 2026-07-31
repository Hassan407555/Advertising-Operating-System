import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  [
    "flex w-full rounded-[var(--radius-md)] bg-input/40",
    "border border-border/60 shadow-[var(--shadow-xs)]",
    "px-3 text-sm text-foreground",
    "outline-none transition-surface",
    "placeholder:text-muted-foreground/80",
    "hover:border-border",
    "focus-visible:border-primary/50 focus-visible:shadow-[var(--shadow-focus)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]",
  ].join(" "),
  {
    variants: {
      size: {
        default: "h-9 py-1",
        sm: "h-8 py-0.5 text-xs",
        lg: "h-11 py-2",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof inputVariants>;

export function Input({ className, size, ...props }: InputProps) {
  return <input className={cn(inputVariants({ size, className }))} {...props} />;
}

export { inputVariants };
