"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageEmptyProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  /** Compact for nested panels / tables */
  size?: "default" | "sm";
}

export function PageEmpty({
  title,
  description,
  action,
  icon,
  className,
  size = "default",
}: PageEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center shadow-[var(--shadow-card)]",
        "rounded-[var(--radius-xl)] bg-card",
        size === "default" ? "px-8 py-14" : "px-6 py-10",
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "mb-4 flex items-center justify-center rounded-[var(--radius-md)] bg-muted text-muted-foreground",
            size === "default" ? "h-11 w-11" : "h-9 w-9",
          )}
        >
          {icon}
        </div>
      ) : null}
      <h2 className={cn(size === "default" ? "text-heading" : "text-subheading")}>{title}</h2>
      <p className="mt-2 max-w-md text-body-sm">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
