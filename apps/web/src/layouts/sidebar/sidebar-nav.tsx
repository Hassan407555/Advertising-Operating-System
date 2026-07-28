"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChartLine,
  Cable,
  FolderKanban,
  LayoutDashboard,
  Megaphone,
  RefreshCw,
  Settings,
  Sparkles,
  Store,
  Users,
  UsersRound,
  Waypoints,
  Workflow,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { usePermission } from "@/hooks/use-permission";
import { cn } from "@/lib/utils";

const navItems = [
  { href: ROUTES.DASHBOARD, label: "Dashboard", icon: LayoutDashboard, action: "view" as const },
  { href: ROUTES.CAMPAIGNS, label: "Campaigns", icon: Megaphone, action: "view" as const },
  { href: ROUTES.CAMPAIGN_GENERATOR, label: "Campaign Generator", icon: Sparkles, action: "view" as const },
  { href: ROUTES.AI_COPY, label: "AI Copy", icon: Bot, action: "view" as const },
  { href: ROUTES.PUBLISHER, label: "Publisher", icon: Waypoints, action: "view" as const },
  { href: ROUTES.SYNCHRONIZATION, label: "Synchronization", icon: RefreshCw, action: "view" as const },
  { href: ROUTES.AUTOMATION_PIPELINES, label: "Automation", icon: Workflow, action: "view" as const },
  { href: ROUTES.ANALYTICS, label: "Analytics", icon: ChartLine, action: "view" as const },
  { href: ROUTES.STORAGE, label: "Storage", icon: FolderKanban, action: "view" as const },
  { href: ROUTES.SHOPIFY, label: "Shopify", icon: Store, action: "view" as const },
  { href: ROUTES.PLATFORM_CONNECTIONS, label: "Platform Connections", icon: Cable, action: "view" as const },
  { href: ROUTES.ORGANIZATION, label: "Organization", icon: Users, action: "manage" as const },
  { href: ROUTES.MEMBERS, label: "Members", icon: UsersRound, action: "manage" as const },
  { href: ROUTES.SETTINGS, label: "Settings", icon: Settings, action: "view" as const },
];

interface SidebarNavProps {
  open: boolean;
  onClose: () => void;
}

export function SidebarNav({ open, onClose }: SidebarNavProps) {
  const pathname = usePathname();
  const canView = usePermission("view");
  const canManage = usePermission("manage");

  if (!canView) {
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
      <div className="mb-4 text-sm font-semibold text-muted-foreground">Advertising OS</div>
      <nav className="space-y-1">
        {navItems
          .filter((item) => (item.action === "manage" ? canManage : canView))
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted",
                pathname.startsWith(item.href) && "bg-muted text-foreground",
              )}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          ))}
      </nav>
    </aside>
  );
}
