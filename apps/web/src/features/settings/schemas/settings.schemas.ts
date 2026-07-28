import { z } from "zod";
import { updateOrganizationSchema } from "@/features/organizations/schemas/organization.schemas";

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required.").max(50),
  lastName: z.string().min(1, "Last name is required.").max(50),
  phone: z.string().max(20).optional().or(z.literal("")),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
  bio: z.string().max(1000).optional().or(z.literal("")),
  timezone: z.string().optional().or(z.literal("")),
  language: z.string().optional().or(z.literal("")),
  avatarUrl: z.union([z.string().url("Avatar must be a valid URL."), z.literal("")]),
});

export const updateOrganizationSettingsSchema = updateOrganizationSchema;

export type UpdateUserProfileFormValues = z.infer<typeof updateUserProfileSchema>;
export type UpdateOrganizationSettingsFormValues = z.infer<typeof updateOrganizationSettingsSchema>;
