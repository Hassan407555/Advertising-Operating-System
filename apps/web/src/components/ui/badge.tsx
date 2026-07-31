import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 whitespace-nowrap",
    "rounded-[var(--radius-sm)] border px-2 py-0.5",
    "text-xs font-medium leading-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border-transparent bg-muted text-foreground-secondary",
        success: "border-transparent bg-success-muted text-emerald-300",
        warning: "border-transparent bg-warning-muted text-amber-200",
        danger: "border-transparent bg-destructive-muted text-red-300",
        info: "border-transparent bg-info-muted text-sky-200",
        outline: "border-border/80 bg-transparent text-muted-foreground",
        /** Soft violet — AI / primary status only */
        ai: "border-transparent bg-primary-muted text-primary-muted-foreground",
        /** Shopify integration */
        shopify: "border-transparent bg-shopify-muted text-emerald-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { badgeVariants };
