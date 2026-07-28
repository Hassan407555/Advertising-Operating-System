"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { getCurrentUser } from "@/features/auth/api/auth.api";
import { setUnauthorizedHandler } from "@/lib/api/client";
import { readTokens, syncAccessCookieFromStorage, writeTokens } from "@/lib/auth/token-storage";
import type {
  AuthLoginResponse,
  MembershipSummary,
  OrganizationSummary,
  SessionState,
  SessionTokens,
} from "@/types/auth";

interface SessionContextValue extends SessionState {
  setTokens: (tokens: SessionTokens | null) => void;
  applyAuthLogin: (payload: AuthLoginResponse) => void;
  applyCurrentUser: (payload: { organizations: OrganizationSummary[]; memberships: MembershipSummary[]; user: SessionState["user"] }) => void;
  setActiveOrganization: (organizationId: string) => void;
  patchActiveOrganization: (patch: Partial<Pick<OrganizationSummary, "name" | "slug">>) => void;
  clearSession: () => void;
  isAuthenticated: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const initialTokens = readTokens();
if (initialTokens) {
  syncAccessCookieFromStorage();
}
export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionState>({
    user: null,
    organization: null,
    membership: null,
    organizations: [],
    memberships: [],
    tokens: initialTokens,
    isBootstrapping: Boolean(initialTokens?.accessToken),
  });

  const setTokens = useCallback((tokens: SessionTokens | null) => {
    writeTokens(tokens);
    setSession((prev) => ({ ...prev, tokens }));
  }, []);

  const applyAuthLogin = useCallback((payload: AuthLoginResponse) => {
    setSession({
      user: payload.user,
      organization: payload.organization,
      membership: payload.membership,
      organizations: [payload.organization],
      memberships: [payload.membership],
      tokens: payload.tokens,
      isBootstrapping: false,
    });
  }, []);

  const applyCurrentUser = useCallback(
    (payload: {
      organizations: OrganizationSummary[];
      memberships: MembershipSummary[];
      user: SessionState["user"];
    }) => {
      setSession((prev) => {
        const activeOrganization =
          prev.organization ??
          payload.organizations[0] ??
          null;
        const activeMembership =
          payload.memberships.find((membership) => membership.organizationId === activeOrganization?.id) ??
          payload.memberships[0] ??
          null;

        return {
          ...prev,
          user: payload.user,
          organizations: payload.organizations,
          memberships: payload.memberships,
          organization: activeOrganization,
          membership: activeMembership,
          isBootstrapping: false,
        };
      });
    },
    [],
  );

  const setActiveOrganization = useCallback((organizationId: string) => {
    setSession((prev) => ({
      ...prev,
      organization: prev.organizations.find((organization) => organization.id === organizationId) ?? prev.organization,
      membership:
        prev.memberships.find((membership) => membership.organizationId === organizationId) ?? prev.membership,
    }));
  }, []);

  const patchActiveOrganization = useCallback((patch: Partial<Pick<OrganizationSummary, "name" | "slug">>) => {
    setSession((prev) => {
      if (!prev.organization) {
        return prev;
      }
      const nextOrganization = { ...prev.organization, ...patch };
      return {
        ...prev,
        organization: nextOrganization,
        organizations: prev.organizations.map((organization) =>
          organization.id === nextOrganization.id ? nextOrganization : organization,
        ),
      };
    });
  }, []);

  const clearSession = useCallback(() => {
    writeTokens(null);
    setSession({
      user: null,
      organization: null,
      membership: null,
      organizations: [],
      memberships: [],
      tokens: null,
      isBootstrapping: false,
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    if (!initialTokens?.accessToken) {
      return;
    }

    let isMounted = true;

    getCurrentUser()
      .then((payload) => {
        if (!isMounted) {
          return;
        }
        applyCurrentUser(payload);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        clearSession();
      });

    return () => {
      isMounted = false;
    };
  }, [applyCurrentUser, clearSession]);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...session,
      setTokens,
      applyAuthLogin,
      applyCurrentUser,
      setActiveOrganization,
      patchActiveOrganization,
      clearSession,
      isAuthenticated: Boolean(session.tokens?.accessToken),
    }),
    [session, clearSession, applyAuthLogin, applyCurrentUser, setActiveOrganization, patchActiveOrganization, setTokens],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
