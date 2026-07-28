export interface GenerateAiCopyPayload {
  campaignId: string;
  organizationId: string;
}

export interface GeneratedCreativeCopy {
  creativeId: string;
  productId?: string;
  adIds: string[];
  headline: string;
  primaryText: string;
  description: string;
  cta: string;
  suggestedHook: string;
  painPoints: string[];
  benefits: string[];
  targetAudienceSummary: string;
  offerAngle: string;
  marketingAngle: string;
  platformNotes: string;
  tone: string;
  provider: string;
  model: string;
}

export interface GenerateAiCopyResponse {
  success: boolean;
  campaignId: string;
  creativesProcessed: number;
  adsProcessed: number;
  execution: {
    provider: string;
    model?: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
  };
  generated: GeneratedCreativeCopy[];
}
