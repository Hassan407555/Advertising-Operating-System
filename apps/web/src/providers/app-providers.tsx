"use client";

import type { PropsWithChildren } from "react";
import { Toaster } from "sonner";
import { GlobalLoadingIndicator } from "@/components/shared/states/global-loading-indicator";
import { QueryProvider } from "@/providers/query-provider";
import { SessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ActiveStoreProvider } from "@/features/stores/providers/active-store-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <QueryProvider>
          <ActiveStoreProvider>
            <GlobalLoadingIndicator />
            {children}
            <Toaster richColors position="top-right" />
          </ActiveStoreProvider>
        </QueryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
