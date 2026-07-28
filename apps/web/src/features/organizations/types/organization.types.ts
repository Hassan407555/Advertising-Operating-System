import type { Role } from "@/types/auth";

export interface CurrentOrganizationResponse {
  id: string;
  name: string;
  slug: string;
  membershipRole: Role | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  slug?: string;
}

export interface OrganizationMember {
  membershipId: string;
  role: Role;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    status: string;
  };
}

export interface Membership {
  id: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  };
}

export interface UpdateMembershipRolePayload {
  role: Role;
}

export interface CreateInvitationPayload {
  email: string;
  role: Role;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: Role;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvitationResponse {
  invitation: Invitation;
  token: string;
}

export interface AcceptInvitationPayload {
  token: string;
}

export interface SwitchOrganizationResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    id: string;
    role: Role;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
