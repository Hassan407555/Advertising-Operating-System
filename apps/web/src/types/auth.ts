export type Role = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface MembershipSummary {
  id: string;
  role: Role;
  organizationId?: string;
  createdAt?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionState {
  user: AuthUser | null;
  organization: OrganizationSummary | null;
  membership: MembershipSummary | null;
  organizations: OrganizationSummary[];
  memberships: MembershipSummary[];
  tokens: SessionTokens | null;
  isBootstrapping: boolean;
}

export interface AuthLoginResponse {
  user: AuthUser;
  organization: OrganizationSummary;
  membership: MembershipSummary;
  tokens: SessionTokens;
}

export interface CurrentUserResponse {
  user: AuthUser;
  organizations: OrganizationSummary[];
  memberships: MembershipSummary[];
}
