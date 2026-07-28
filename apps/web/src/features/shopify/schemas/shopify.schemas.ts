import { z } from "zod";

export const connectShopifySchema = z.object({
  shopDomain: z
    .string()
    .min(1, "Shop domain is required.")
    .regex(/^[a-zA-Z0-9-]+\.myshopify\.com$/, "Shop domain must be a valid myshopify.com domain."),
});

export type ConnectShopifyFormValues = z.infer<typeof connectShopifySchema>;
