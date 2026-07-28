"use client";

import type { ReactNode } from "react";

interface PageEmptyProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageEmpty({ title, description, action }: PageEmptyProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
