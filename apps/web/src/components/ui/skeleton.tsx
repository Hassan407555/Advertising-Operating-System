import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const skeletonVariants = cva("rounded-[var(--radius-md)]", {
  variants: {
    variant: {
      /** Soft pulse — default loaders */
      pulse: "animate-pulse bg-muted",
      /** Shimmer sweep — denser surfaces */
      shimmer:
        "bg-[linear-gradient(90deg,var(--muted)_0%,var(--subtle)_45%,var(--muted)_90%)] bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite]",
    },
  },
  defaultVariants: {
    variant: "pulse",
  },
});

interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

export function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant, className }))}
      aria-hidden="true"
      {...props}
    />
  );
}

export { skeletonVariants };
