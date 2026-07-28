import { z } from "zod";

const budgetSchema = z.object({
  dailyBudget: z.coerce.number().positive("Budget must be a positive number"),
  currency: z.string().optional(),
});

const sharedSchema = {
  campaignName: z.string().trim().min(1, "Campaign name is required"),
  objective: z.string().trim().min(1, "Objective is required"),
  audience: z.string().trim().min(1, "Audience is required"),
  budget: budgetSchema,
  cta: z.string().trim().min(1, "CTA is required"),
};

export const imageReviewSchema = z.object({
  campaignType: z.literal("IMAGE"),
  ...sharedSchema,
  headlines: z.array(z.string().trim().min(1)).min(1, "At least one headline is required"),
  primaryText: z.string().trim().min(1, "Primary text is required"),
  description: z.string().trim().min(1, "Description is required"),
  creativeBrief: z.string().trim().min(1, "Creative brief is required"),
});

export const carouselReviewSchema = z.object({
  campaignType: z.literal("CAROUSEL"),
  ...sharedSchema,
  cardTitles: z.array(z.string().trim().min(1)).min(1, "At least one card title is required"),
  cardDescriptions: z
    .array(z.string().trim().min(1))
    .min(1, "At least one card description is required"),
  cardOrder: z.array(z.coerce.number()).min(1, "Card order is required"),
  creativeStrategy: z.string().trim().min(1, "Creative strategy is required"),
});

export const videoReviewSchema = z.object({
  campaignType: z.literal("VIDEO"),
  ...sharedSchema,
  hook: z.string().trim().min(1, "Hook is required"),
  videoScript: z.string().trim().min(1, "Video script is required"),
  storyboard: z.array(z.string().trim().min(1)).min(1, "Storyboard is required"),
  shotList: z.array(z.string().trim().min(1)).min(1, "Shot list is required"),
});

export const campaignReviewSchema = z.discriminatedUnion("campaignType", [
  imageReviewSchema,
  carouselReviewSchema,
  videoReviewSchema,
]);

export type CampaignReviewFormValues = z.infer<typeof campaignReviewSchema>;
export type ImageReviewFormValues = z.infer<typeof imageReviewSchema>;
export type CarouselReviewFormValues = z.infer<typeof carouselReviewSchema>;
export type VideoReviewFormValues = z.infer<typeof videoReviewSchema>;

export function parseCampaignReviewPayload(
  campaignType: "IMAGE" | "CAROUSEL" | "VIDEO",
  payload: Record<string, unknown>,
): CampaignReviewFormValues {
  const withType = { ...payload, campaignType };
  const parsed = campaignReviewSchema.safeParse(withType);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid campaign payload";
    throw new Error(message);
  }
  return parsed.data;
}
