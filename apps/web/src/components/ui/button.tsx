import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[var(--radius-md)] text-sm font-medium",
    "transition-all duration-[var(--duration-fast)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Primary CTAs — violet reserved for decisive actions */
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-primary-hover hover:shadow-[var(--shadow-primary)]",
        /** Subtle filled — neutral surfaces */
        secondary:
          "bg-muted text-foreground shadow-[var(--shadow-xs)] hover:bg-subtle hover:text-foreground",
        /** Quiet bordered / ghosted outline */
        outline:
          "border border-border/70 bg-transparent text-foreground shadow-[var(--shadow-xs)] hover:bg-muted/60 hover:border-border",
        /** Minimal — toolbar / secondary chrome */
        ghost: "bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        /** Text-only */
        link: "bg-transparent text-foreground underline-offset-4 hover:underline hover:text-foreground",
        /** Destructive */
        destructive:
          "bg-destructive/90 text-destructive-foreground shadow-[var(--shadow-xs)] hover:bg-destructive",
        /** Soft AI accent — highlights, not page chrome */
        ai: "bg-primary-muted text-primary-muted-foreground hover:bg-primary/20",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "h-11 rounded-[var(--radius-md)] px-6",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    ref?: React.Ref<HTMLButtonElement>;
  };

export function Button({ className, variant, size, type = "button", ref, ...props }: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
