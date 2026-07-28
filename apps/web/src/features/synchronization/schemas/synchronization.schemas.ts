import { z } from "zod";

export const synchronizationFormSchema = z
  .object({
    targetType: z.enum(["campaign", "account"]),
    campaignId: z.string().optional(),
    adAccountId: z.string().optional(),
    statusCampaignId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.targetType === "campaign" && !value.campaignId) {
      ctx.addIssue({
        code: "custom",
        path: ["campaignId"],
        message: "Campaign is required for campaign synchronization.",
      });
    }

    if (value.targetType === "account" && !value.adAccountId) {
      ctx.addIssue({
        code: "custom",
        path: ["adAccountId"],
        message: "Ad account is required for account synchronization.",
      });
    }
  });

export type SynchronizationFormValues = z.infer<typeof synchronizationFormSchema>;
