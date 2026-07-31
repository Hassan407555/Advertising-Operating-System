"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Products",
  campaigns: "Campaigns",
  "ai-sessions": "AI Sessions",
  analytics: "Analytics",
  advertising: "Advertising",
  shopify: "Shopify",
  connections: "Connections",
  details: "Details",
  organization: "Organization",
  members: "Members",
  invitations: "Invitations",
  settings: "Settings",
  profile: "Profile",
  login: "Login",
  register: "Register",
};

function labelForSegment(segment: string, index: number, segments: string[]) {
  if (SEGMENT_LABELS[segment]) {
    return SEGMENT_LABELS[segment];
  }

  const parent = segments[index - 1];
  if (
    parent === "campaigns" ||
    parent === "ai-sessions" ||
    parent === "analytics" ||
    parent === "products"
  ) {
    return "Details";
  }

  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function BreadcrumbTrail() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <nav
        className="border-b border-border/50 px-[var(--page-gutter-x)] py-2.5"
        aria-label="Breadcrumb"
      >
        <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <li className="font-medium text-foreground">Dashboard</li>
        </ol>
      </nav>
    );
  }

  return (
    <nav
      className="border-b border-border/50 px-[var(--page-gutter-x)] py-2.5"
      aria-label="Breadcrumb"
    >
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link
            href={ROUTES.DASHBOARD}
            className={cn(
              "rounded-sm transition-colors duration-[var(--duration-fast)]",
              "hover:text-foreground",
              "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
            )}
          >
            Home
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = labelForSegment(segment, index, segments);

          return (
            <li key={href} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
              {isLast ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className={cn(
                    "rounded-sm transition-colors duration-[var(--duration-fast)]",
                    "hover:text-foreground",
                    "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                  )}
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
