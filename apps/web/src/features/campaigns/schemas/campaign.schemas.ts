import { z } from "zod";
import {
  CAMPAIGN_BUYING_TYPE_OPTIONS,
  CAMPAIGN_OBJECTIVE_OPTIONS,
  CAMPAIGN_STATUS_OPTIONS,
  PLATFORM_OPTIONS,
} from "@/features/campaigns/constants/campaign-options";

export const campaignFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(CAMPAIGN_STATUS_OPTIONS).optional(),
  objective: z.enum(CAMPAIGN_OBJECTIVE_OPTIONS).optional(),
  platform: z.enum(PLATFORM_OPTIONS).optional(),
});

export const createCampaignSchema = z
  .object({
    adAccountId: z.string().min(1, "Ad account is required."),
    name: z.string().min(1).max(255),
    slug: z.string().max(100).optional().or(z.literal("")),
    objective: z.enum(CAMPAIGN_OBJECTIVE_OPTIONS),
    buyingType: z.enum(CAMPAIGN_BUYING_TYPE_OPTIONS),
    currency: z.string(),
    dailyBudget: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : value),
      z.coerce.number().min(0).optional(),
    ),
    lifetimeBudget: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : value),
      z.coerce.number().min(0).optional(),
    ),
    startDate: z.string().optional().or(z.literal("")),
    endDate: z.string().optional().or(z.literal("")),
    isActive: z.boolean(),
  })
  .refine(
    (value) => !value.startDate || !value.endDate || new Date(value.startDate) <= new Date(value.endDate),
    { path: ["endDate"], message: "End date must be after start date." },
  );

export const updateCampaignSchema = createCampaignSchema.extend({
  version: z.number().int().min(1),
});

export type CreateCampaignFormValues = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignFormValues = z.infer<typeof updateCampaignSchema>;
