import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PageGridCols = 1 | 2 | 3 | 4;

interface PageGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Desktop column count; stacks on small screens */
  cols?: PageGridCols;
  gap?: "sm" | "default" | "lg";
}

const colsClass: Record<PageGridCols, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
};

const gapClass = {
  sm: "gap-3",
  default: "gap-4 md:gap-5",
  lg: "gap-5 md:gap-6",
} as const;

/**
 * Responsive content grid — Prefer this over one-off grid class strings.
 */
export function PageGrid({
  cols = 2,
  gap = "default",
  className,
  children,
  ...props
}: PageGridProps) {
  return (
    <div className={cn("grid", colsClass[cols], gapClass[gap], className)} {...props}>
      {children}
    </div>
  );
}
