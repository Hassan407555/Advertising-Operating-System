import { z } from "zod";
import { MEMBERSHIP_ROLE_OPTIONS } from "@/features/organizations/constants/organization.constants";

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens."),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(MEMBERSHIP_ROLE_OPTIONS),
});

export const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address."),
  role: z.enum(MEMBERSHIP_ROLE_OPTIONS),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required."),
});

export type UpdateOrganizationFormValues = z.infer<typeof updateOrganizationSchema>;
export type UpdateMemberRoleFormValues = z.infer<typeof updateMemberRoleSchema>;
export type CreateInvitationFormValues = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;
