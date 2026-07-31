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
  Building2,
  UsersRound,
  Waypoints,
  Mail,
  Sparkles,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import type { PermissionAction } from "@/types/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  action: PermissionAction;
  /** Backend allows VIEWER on org read surfaces even when general `view` excludes VIEWER. */
  allowViewer?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/**
 * Information architecture (Phase 2).
 * Routes are unchanged — labels/groups only.
 * "Drafts" maps to Campaigns (same /campaigns surface; no separate route).
 */
const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { href: ROUTES.DASHBOARD, label: "Dashboard", icon: LayoutDashboard, action: "view" },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { href: ROUTES.SHOPIFY_CONNECTIONS, label: "Shopify", icon: Store, action: "view" },
      { href: ROUTES.PRODUCTS, label: "Products", icon: Package, action: "view" },
    ],
  },
  {
    id: "ai-studio",
    label: "AI Studio",
    items: [
      { href: ROUTES.AI_SESSIONS, label: "AI Sessions", icon: Bot, action: "view" },
      { href: ROUTES.CAMPAIGNS, label: "Campaigns", icon: Megaphone, action: "view" },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    items: [
      { href: ROUTES.ANALYTICS, label: "Analytics", icon: ChartLine, action: "view" },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        href: ROUTES.ADVERTISING_CONFIGURATION,
        label: "Advertising",
        icon: Waypoints,
        action: "view",
      },
      {
        href: ROUTES.ORGANIZATION,
        label: "Organization",
        icon: Building2,
        action: "view",
        allowViewer: true,
      },
      {
        href: ROUTES.MEMBERS,
        label: "Members",
        icon: UsersRound,
        action: "view",
        allowViewer: true,
      },
      { href: ROUTES.INVITATIONS, label: "Invitations", icon: Mail, action: "manage" },
      { href: ROUTES.SETTINGS, label: "Settings", icon: Settings, action: "view" },
    ],
  },
];

interface SidebarNavProps {
  open: boolean;
  onClose: () => void;
}

function isNavActive(pathname: string, href: string) {
  if (pathname === href) {
    return true;
  }
  // Avoid /shopify matching /shopify/connections incorrectly for sibling routes —
  // still treat nested detail pages as active under their list route.
  return pathname.startsWith(`${href}/`);
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

  const canSeeItem = (item: NavItem) => {
    if (item.allowViewer && isViewer) {
      return true;
    }
    if (item.action === "manage") {
      return canManage;
    }
    return canView;
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-[var(--sidebar-width-wide)] flex-col",
        "border-r border-border/50 bg-[image:var(--gradient-sidebar)]",
        "p-3 transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]",
        "md:static md:w-[var(--sidebar-width)] md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
      aria-label="Sidebar"
    >
      <div className="mb-5 flex items-center gap-3 px-2.5 pt-1">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            "bg-primary/15 text-primary shadow-[var(--shadow-xs)]",
            "ring-1 ring-primary/20",
          )}
        >
          <Sparkles className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight text-foreground">
            AI Meta Ads Studio
          </div>
          <div className="truncate text-[11px] text-muted-foreground">Advertising workspace</div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto pb-4" aria-label="Primary">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(canSeeItem);
          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <div key={group.id}>
              <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-sm",
                        "text-muted-foreground transition-all duration-[var(--duration-fast)]",
                        "hover:bg-muted/60 hover:text-foreground",
                        "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
                        active &&
                          "bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_rgba(124,58,237,0.22)]",
                      )}
                    >
                      {active ? (
                        <span
                          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                          aria-hidden
                        />
                      ) : null}
                      <item.icon
                        className={cn(
                          "size-4 shrink-0 transition-colors duration-[var(--duration-fast)]",
                          active
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground",
                        )}
                        aria-hidden
                      />
                      <span className="truncate font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
