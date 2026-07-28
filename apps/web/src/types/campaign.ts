export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
export type CampaignObjective =
  | "AWARENESS"
  | "TRAFFIC"
  | "ENGAGEMENT"
  | "LEADS"
  | "SALES"
  | "APP_PROMOTION"
  | "VIDEO"
  | "LOCAL"
  | "CATALOG_SALES"
  | "STORE_VISITS"
  | "MESSAGES";
export type CampaignBuyingType = "AUCTION" | "RESERVED" | "FIXED" | "PROGRAMMATIC";
export type PlatformType =
  | "META"
  | "GOOGLE"
  | "TIKTOK"
  | "LINKEDIN"
  | "SNAPCHAT"
  | "PINTEREST"
  | "MICROSOFT"
  | "TWITTER"
  | "REDDIT"
  | "AMAZON"
  | "SHOPIFY";

export interface Campaign {
  id: string;
  organizationId: string;
  adAccountId: string;
  externalId: string;
  externalName: string | null;
  externalStatus: string | null;
  name: string;
  slug: string | null;
  objective: CampaignObjective;
  buyingType: CampaignBuyingType;
  status: CampaignStatus;
  isActive: boolean;
  currency: string;
  dailyBudget: string | null;
  lifetimeBudget: string | null;
  startDate: string | null;
  endDate: string | null;
  version: number;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: {
    id: string;
    name: string;
  };
  adAccount?: {
    id: string;
    accountName: string;
    platform: PlatformType;
    externalId: string;
    currency: string;
    timezone: string;
    isActive: boolean;
  };
}

export interface CampaignListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: CampaignStatus;
  objective?: CampaignObjective;
  adAccountId?: string;
  platform?: PlatformType;
  isActive?: boolean;
  sortBy?: "name" | "status" | "objective" | "createdAt" | "updatedAt" | "startDate" | "endDate";
  sortOrder?: "asc" | "desc";
}

export interface CreateCampaignPayload {
  adAccountId: string;
  name: string;
  slug?: string;
  objective: CampaignObjective;
  buyingType?: CampaignBuyingType;
  dailyBudget?: number;
  lifetimeBudget?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface UpdateCampaignPayload extends Partial<CreateCampaignPayload> {
  version: number;
}
