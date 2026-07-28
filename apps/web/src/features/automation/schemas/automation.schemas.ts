import { z } from "zod";
import { MARKETING_GOAL_OPTIONS } from "@/features/campaign-generator/constants/campaign-generator-options";

const keyValueRecordSchema = z.record(z.string(), z.string().min(1)).default({});

const campaignWorkflowSchema = z.object({
  productId: z.string().min(1, "Product ID is required."),
  countries: z.string().min(1, "At least one country is required."),
  platforms: z.string().min(1, "At least one platform is required."),
  dailyBudget: z.coerce.number().min(1, "Daily budget must be at least 1."),
  language: z.string().min(1, "Language is required.").max(10),
  marketingGoal: z.enum(MARKETING_GOAL_OPTIONS),
  adAccountIds: keyValueRecordSchema,
  currency: z.string().optional().or(z.literal("")),
});

const publishWorkflowSchema = z
  .object({
    campaignId: z.string().optional().or(z.literal("")),
    campaignIds: z
      .string()
      .optional()
      .or(z.literal("")),
    platform: z.string().optional().or(z.literal("")),
    adAccountId: z.string().optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const campaignIds = value.campaignIds
      ? value.campaignIds
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];
    if (!value.campaignId && campaignIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["campaignId"],
        message: "Provide campaignId or campaignIds.",
      });
    }
  });

export const automationWorkflowSchema = z.discriminatedUnion("workflowType", [
  z.object({
    workflowType: z.literal("campaign"),
    campaign: campaignWorkflowSchema,
  }),
  z.object({
    workflowType: z.literal("publish"),
    publish: publishWorkflowSchema,
  }),
  z.object({
    workflowType: z.literal("full"),
    full: campaignWorkflowSchema,
  }),
]);

export type AutomationWorkflowFormValues = z.infer<typeof automationWorkflowSchema>;
