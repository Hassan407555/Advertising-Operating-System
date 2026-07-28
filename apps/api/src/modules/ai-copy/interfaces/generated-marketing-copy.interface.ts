import { CallToAction } from '@prisma/client';

export interface GeneratedMarketingCopy {
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  ctaEnum?: CallToAction | string;
  suggestedHook: string;
  painPoints: string[];
  benefits: string[];
  targetAudienceSummary: string;
  offerAngle: string;
  marketingAngle: string;
  platformNotes: string;
  tone: string;
}
