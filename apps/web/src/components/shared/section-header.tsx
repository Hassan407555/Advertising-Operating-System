import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** Optional denser hierarchy for nested blocks */
  size?: "default" | "sm";
  /** Optional id for the heading — enables aria-labelledby on parent sections */
  titleId?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
  size = "default",
  titleId,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl space-y-1">
        <h2
          id={titleId}
          className={cn(size === "sm" ? "text-subheading" : "text-heading")}
        >
          {title}
        </h2>
        {description ? <p className="text-body-sm">{description}</p> : null}
      </div>
      {actions ? <div className="inline-cluster">{actions}</div> : null}
    </div>
  );
}
