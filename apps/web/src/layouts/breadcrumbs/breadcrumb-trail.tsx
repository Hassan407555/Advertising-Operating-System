"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants/routes";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Products",
  campaigns: "Campaign History",
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
  if (parent === "campaigns" || parent === "ai-sessions" || parent === "analytics") {
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
      <nav className="border-b border-border px-4 py-3 text-sm" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
          <li className="text-foreground">Dashboard</li>
        </ol>
      </nav>
    );
  }

  return (
    <nav className="border-b border-border px-4 py-3 text-sm" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        <li>
          <Link href={ROUTES.DASHBOARD} className="hover:text-foreground underline-offset-4 hover:underline">
            App
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = labelForSegment(segment, index, segments);

          return (
            <li key={href} className="flex items-center gap-1">
              <span aria-hidden>/</span>
              {isLast ? (
                <span className="text-foreground" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link href={href} className="hover:text-foreground underline-offset-4 hover:underline">
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
