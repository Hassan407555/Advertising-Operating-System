import { z } from "zod";

export const aiCopyGenerateSchema = z.object({
  campaignId: z.string().min(1, "Campaign is required."),
});

export type AiCopyGenerateFormValues = z.infer<typeof aiCopyGenerateSchema>;
