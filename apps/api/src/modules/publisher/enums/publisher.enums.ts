/**
 * Platforms the Publisher gateway can target.
 * Keep this separate from Prisma PlatformType so Shopify/etc.
 * are never treated as ad publishers.
 */
export enum PublisherPlatform {
  META = 'META',
  TIKTOK = 'TIKTOK',
  GOOGLE = 'GOOGLE',
  LINKEDIN = 'LINKEDIN',
}

export enum PublishStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  PUBLISHED = 'PUBLISHED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum PublishEntityType {
  CAMPAIGN = 'CAMPAIGN',
  AD_SET = 'AD_SET',
  AD = 'AD',
  CREATIVE = 'CREATIVE',
}
