"use client";

import { useState, type PropsWithChildren } from "react";
import { AuthGuard } from "@/components/shared/auth/auth-guard";
import { ContentContainer } from "@/layouts/app-shell/content-container";
import { BreadcrumbTrail } from "@/layouts/breadcrumbs/breadcrumb-trail";
import { SidebarNav } from "@/layouts/sidebar/sidebar-nav";
import { TopBar } from "@/layouts/topbar/topbar";

export default function AppLayout({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-background">
        <SidebarNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-black/50 backdrop-blur-[1px] md:hidden animate-fade-in"
          />
        ) : null}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <TopBar setSidebarOpen={setSidebarOpen} />
          <BreadcrumbTrail />
          <ContentContainer className="animate-fade-in">{children}</ContentContainer>
        </div>
      </div>
    </AuthGuard>
  );
}
