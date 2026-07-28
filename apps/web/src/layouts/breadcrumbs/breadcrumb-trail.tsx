"use client";

import { usePathname } from "next/navigation";

export function BreadcrumbTrail() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const label = segments.length ? segments.join(" / ") : "Dashboard";

  return (
    <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
      <span>App</span> / <span className="text-foreground capitalize">{label.replaceAll("-", " ")}</span>
    </div>
  );
}
