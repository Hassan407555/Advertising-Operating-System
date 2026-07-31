import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const cardVariants = cva("transition-surface text-card-foreground", {
  variants: {
    variant: {
      /** Default surface — soft elevation, light hairline */
      default: "rounded-[var(--radius-xl)] bg-card p-5 shadow-[var(--shadow-card)]",
      /** Raised panel for modals / important blocks */
      elevated: "rounded-[var(--radius-xl)] bg-card p-5 shadow-[var(--shadow-elevated)]",
      /** Quieter inset surface */
      muted: "rounded-[var(--radius-xl)] bg-muted/50 p-5 shadow-none",
      /** Transparent container — no chrome */
      ghost: "rounded-[var(--radius-xl)] bg-transparent p-0 shadow-none",
      /** Interactive / clickable tile */
      interactive:
        "rounded-[var(--radius-xl)] bg-card p-5 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] hover:bg-card/90 cursor-pointer",
      /** Soft AI highlight rim — reserve purple for AI context */
      ai: "rounded-[var(--radius-xl)] bg-primary-muted/40 p-5 shadow-[var(--shadow-card)] ring-1 ring-primary/20",
    },
    padding: {
      none: "p-0",
      sm: "p-3",
      default: "",
      lg: "p-6",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "default",
  },
});

interface CardProps extends HTMLAttributes<HTMLElement>, VariantProps<typeof cardVariants> {
  as?: "section" | "div" | "article";
}

export function Card({
  className,
  children,
  variant,
  padding,
  as: Comp = "section",
  ...props
}: CardProps) {
  return (
    <Comp className={cn(cardVariants({ variant, padding, className }))} {...props}>
      {children}
    </Comp>
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-heading", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-body-sm", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-5 flex items-center gap-2", className)} {...props} />;
}

export { cardVariants };
