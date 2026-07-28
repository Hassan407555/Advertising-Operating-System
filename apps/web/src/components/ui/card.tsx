import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends PropsWithChildren {
  className?: string;
}

export function Card({ className, children }: CardProps) {
  return <section className={cn("rounded-lg border border-border bg-card p-4", className)}>{children}</section>;
}
