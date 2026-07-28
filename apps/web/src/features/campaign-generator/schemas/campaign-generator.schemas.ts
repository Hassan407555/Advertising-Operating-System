import { z } from "zod";
import {
  CALL_TO_ACTION_OPTIONS,
  CREATIVE_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  MARKETING_GOAL_OPTIONS,
  SUPPORTED_GENERATOR_PLATFORMS,
} from "@/features/campaign-generator/constants/campaign-generator-options";

export const generatorFormSchema = z
  .object({
    productId: z.string().min(1, "Product ID is required."),
    countriesText: z.string().min(1, "At least one country is required."),
    platforms: z.array(z.enum(SUPPORTED_GENERATOR_PLATFORMS)).min(1, "Select at least one platform."),
    dailyBudget: z.coerce.number().min(1, "Daily budget must be at least 1."),
    language: z.string().min(1, "Language is required.").max(10),
    marketingGoal: z.enum(MARKETING_GOAL_OPTIONS),
    adAccountMeta: z.string().optional(),
    adAccountTiktok: z.string().optional(),
    currency: z.enum(CURRENCY_OPTIONS).default("USD"),
    campaignNamePrefix: z.string().max(100).optional(),
    callToAction: z.enum(CALL_TO_ACTION_OPTIONS).optional(),
    creativeType: z.enum(CREATIVE_TYPE_OPTIONS).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.platforms.includes("META") && !value.adAccountMeta) {
      ctx.addIssue({
        code: "custom",
        message: "Meta ad account is required when META is selected.",
        path: ["adAccountMeta"],
      });
    }

    if (value.platforms.includes("TIKTOK") && !value.adAccountTiktok) {
      ctx.addIssue({
        code: "custom",
        message: "TikTok ad account is required when TIKTOK is selected.",
        path: ["adAccountTiktok"],
      });
    }
  });

export type GeneratorFormValues = z.infer<typeof generatorFormSchema>;
