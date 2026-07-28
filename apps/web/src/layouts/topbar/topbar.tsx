"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { Menu, Bell, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useLogoutMutation, useSwitchOrganizationMutation } from "@/features/auth/hooks/use-auth-mutations";
import { useSession } from "@/providers/session-provider";
import { getErrorMessage } from "@/utils/errors";

interface TopBarProps {
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

export function TopBar({ setSidebarOpen }: TopBarProps) {
  const router = useRouter();
  const { clearSession, memberships, organizations, organization, user, setTokens, applyAuthLogin } = useSession();
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
      toast.success("Logged out.");
      router.replace(ROUTES.LOGIN);
    }
  };

  const onSwitchOrganization = async (organizationId: string) => {
    try {
      const payload = await switchOrgMutation.mutateAsync(organizationId);
      setTokens(payload.tokens);
      applyAuthLogin(payload);
      toast.success("Organization switched.");
      router.replace(ROUTES.DASHBOARD);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to switch organization."));
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md p-2 hover:bg-muted md:hidden"
          aria-label="Open sidebar"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="size-4" />
        </button>
        <div className="text-sm text-muted-foreground">Advertising Operating System</div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className="rounded-md p-2 hover:bg-muted" aria-label="Notifications">
          <Bell className="size-4" />
        </button>

        {memberships.length > 1 ? (
          <select
            className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
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
        ) : null}

        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-muted">
            {userDisplay.name}
            <ChevronDown className="size-4" />
          </summary>
          <div className="absolute right-0 mt-2 w-44 rounded-md border border-border bg-card p-2 shadow-lg">
            <Button type="button" variant="secondary" className="w-full justify-start" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </details>
      </div>
    </header>
  );
}
