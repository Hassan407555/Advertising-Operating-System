"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { getCurrentUser } from "@/features/auth/api/auth.api";
import { useLogoutMutation, useSwitchOrganizationMutation } from "@/features/auth/hooks/use-auth-mutations";
import { StoreSwitcher } from "@/features/stores/components/store-switcher";
import { useSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/utils/errors";

interface TopBarProps {
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

export function TopBar({ setSidebarOpen }: TopBarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    clearSession,
    memberships,
    organizations,
    organization,
    user,
    setTokens,
    applyCurrentUser,
    setActiveOrganization,
  } = useSession();
  const logoutMutation = useLogoutMutation();
  const switchOrgMutation = useSwitchOrganizationMutation();

  const userDisplay = useMemo(() => {
    return {
      name: user ? `${user.firstName} ${user.lastName}` : "User",
    };
  }, [user]);

  const onLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Best-effort logout; always clear local state.
    } finally {
      clearSession();
      queryClient.clear();
      toast.success("Logged out.");
      router.replace(ROUTES.LOGIN);
    }
  };

  const onSwitchOrganization = async (organizationId: string) => {
    try {
      const payload = await switchOrgMutation.mutateAsync(organizationId);
      setTokens(payload.tokens);
      const currentUser = await getCurrentUser();
      applyCurrentUser(currentUser);
      setActiveOrganization(payload.organization.id);
      await queryClient.clear();
      toast.success("Organization switched.");
      router.replace(ROUTES.DASHBOARD);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to switch organization."));
    }
  };

  return (
    <header
      className={cn(
        "flex h-[var(--topbar-height)] items-center justify-between",
        "border-b border-border/50 bg-background/80 px-[var(--page-gutter-x)] backdrop-blur-sm",
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="size-4" />
        </Button>
        <div className="hidden text-sm text-muted-foreground md:block">AI Meta Ads Studio</div>
      </div>

      <div className="flex items-center gap-2">
        <StoreSwitcher />

        {memberships.length > 1 ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Select organization</span>
            <select
              className={cn(
                "h-8 rounded-[var(--radius-md)] border border-border/60 bg-input/40",
                "px-2 text-sm text-foreground shadow-[var(--shadow-xs)]",
                "transition-surface outline-none",
                "hover:border-border focus-visible:border-primary/50 focus-visible:shadow-[var(--shadow-focus)]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              value={organization?.id ?? ""}
              onChange={(event) => onSwitchOrganization(event.target.value)}
              disabled={switchOrgMutation.isPending}
              aria-label="Select organization"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <details className="relative">
          <summary
            className={cn(
              "flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-[var(--radius-md)]",
              "px-2.5 text-sm text-foreground transition-colors duration-[var(--duration-fast)]",
              "hover:bg-muted/70",
              "focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]",
            )}
          >
            <span className="max-w-[10rem] truncate">{userDisplay.name}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
          </summary>
          <div
            className={cn(
              "absolute right-0 z-40 mt-2 w-48 rounded-[var(--radius-lg)]",
              "bg-popover p-1.5 shadow-[var(--shadow-elevated)] animate-fade-in-scale",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={onLogout}
            >
              <LogOut className="size-3.5" aria-hidden />
              Logout
            </Button>
          </div>
        </details>
      </div>
    </header>
  );
}
