"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChartLine,
  Megaphone,
  LayoutDashboard,
  Package,
  Settings,
  Store,
  Users,
  UsersRound,
  Waypoints,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import type { PermissionAction } from "@/types/permissions";

const navItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  action: PermissionAction;
  /** Backend allows VIEWER on org read surfaces even when general `view` excludes VIEWER. */
  allowViewer?: boolean;
}> = [
  { href: ROUTES.DASHBOARD, label: "Dashboard", icon: LayoutDashboard, action: "view" },
  { href: ROUTES.PRODUCTS, label: "Products", icon: Package, action: "view" },
  { href: ROUTES.CAMPAIGNS, label: "Campaign History", icon: Megaphone, action: "view" },
  { href: ROUTES.AI_SESSIONS, label: "AI Sessions", icon: Bot, action: "view" },
  { href: ROUTES.ANALYTICS, label: "Analytics", icon: ChartLine, action: "view" },
  { href: ROUTES.ADVERTISING_CONFIGURATION, label: "Advertising", icon: Waypoints, action: "view" },
  { href: ROUTES.SHOPIFY_CONNECTIONS, label: "Shopify", icon: Store, action: "view" },
  { href: ROUTES.ORGANIZATION, label: "Organization", icon: Users, action: "view", allowViewer: true },
  { href: ROUTES.MEMBERS, label: "Members", icon: UsersRound, action: "view", allowViewer: true },
  { href: ROUTES.INVITATIONS, label: "Invitations", icon: Users, action: "manage" },
  { href: ROUTES.SETTINGS, label: "Settings", icon: Settings, action: "view" },
];

interface SidebarNavProps {
  open: boolean;
  onClose: () => void;
}

export function SidebarNav({ open, onClose }: SidebarNavProps) {
  const pathname = usePathname();
  const canView = usePermission("view");
  const canManage = usePermission("manage");
  const { membership } = useSession();
  const isViewer = membership?.role === "VIEWER";

  if (!canView && !isViewer) {
    return null;
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 w-72 border-r border-border bg-card p-4 transition-transform md:static md:w-64 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
      aria-label="Sidebar"
    >
      <div className="mb-4 text-sm font-semibold text-foreground">AI Meta Ads Studio</div>
      <nav className="space-y-1" aria-label="Primary">
        {navItems
          .filter((item) => {
            if (item.allowViewer && isViewer) {
              return true;
            }
            if (item.action === "manage") {
              return canManage;
            }
            return canView;
          })
          .map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-muted text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
