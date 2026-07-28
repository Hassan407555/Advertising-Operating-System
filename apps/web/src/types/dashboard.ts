export interface DashboardSummary {
  organization: {
    totalOrganizations: number;
    activeOrganizationId: string;
    activeOrganizationName: string;
    connectedPlatforms: string[];
  };
  campaigns: {
    total: number;
    draft: number;
    published: number;
    active: number;
    paused: number;
    archived: number;
  };
  advertising: {
    metaCampaigns: number;
    tiktokCampaigns: number;
  };
  automation: {
    totalWorkflowRuns: number;
    running: number;
    completed: number;
    failed: number;
  };
  synchronization: {
    lastSynchronization: string | null;
    campaignsSynced: number;
    failedSyncs: number;
  };
  analytics: {
    spend: number;
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number | null;
    cpc: number | null;
    cpm: number | null;
    conversions: number;
    roas: number | null;
  };
  assets: {
    images: number;
    videos: number;
    totalAssets: number;
  };
  shopify: {
    products: number;
    collections: number;
    storeConnected: boolean;
  };
  platforms: {
    meta: {
      connected: boolean;
      tokenStatus: string;
      connectionStatus: string | null;
      accountName: string | null;
      lastSyncedAt: string | null;
    };
    tiktok: {
      connected: boolean;
      tokenStatus: string;
      connectionStatus: string | null;
      accountName: string | null;
      lastSyncedAt: string | null;
    };
  };
  recent: {
    campaigns: Array<{ id: string; name: string; status: string; platform?: string | null; updatedAt: string }>;
    automationRuns: Array<{
      id: string;
      pipelineId: string;
      status: string;
      triggerType: string;
      startedAt: string | null;
      completedAt: string | null;
      createdAt: string;
    }>;
    publishJobs: Array<{
      id: string;
      campaignId: string;
      platform: string;
      status: string;
      dryRun: boolean;
      startedAt: string | null;
      completedAt: string | null;
      createdAt: string;
    }>;
    synchronizations: Array<{
      campaignId: string;
      name: string;
      externalStatus: string | null;
      lastSyncedAt: string | null;
      lastSuccessfulSyncAt: string | null;
      lastFailedSyncAt: string | null;
    }>;
  };
}
