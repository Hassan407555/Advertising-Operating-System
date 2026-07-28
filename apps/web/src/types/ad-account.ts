import type { PlatformType } from "@/types/campaign";

export interface AdAccount {
  id: string;
  organizationId: string;
  platformConnectionId: string;
  platform: PlatformType;
  externalId: string;
  externalName?: string | null;
  accountName: string;
  currency: string;
  timezone: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
