import { z } from "zod";
import { LIVE_PUBLISH_PLATFORMS } from "@/features/publisher/constants/publisher.constants";

export const publisherFormSchema = z.object({
  campaignId: z.string().min(1, "Campaign is required."),
  platform: z.enum(LIVE_PUBLISH_PLATFORMS),
  adAccountId: z.string().min(1, "Ad account is required."),
  dryRun: z.boolean(),
  pageId: z.string().optional(),
  identityId: z.string().optional(),
});

export type PublisherFormValues = z.infer<typeof publisherFormSchema>;
