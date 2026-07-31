import {
  PublishEntityType,
  PublishStatus,
  PublisherPlatform,
} from '../../enums/publisher.enums';
import type { PublishDiagnostics } from '../../types/publish-diagnostics.types';

/**
 * Domain models for the Publisher gateway.
 * Persistence (Prisma PublishJob tables) can be added when the first
 * real provider is implemented — keep the foundation storage-agnostic.
 */

export interface PublishEntityRef {
  type: PublishEntityType;
  id: string;
  externalId?: string;
  name?: string;
}

export interface PublishRequest {
  organizationId: string;
  campaignId: string;
  platform: PublisherPlatform;
  adAccountId: string;
  /**
   * Optional subset of entities to publish.
   * When omitted, the provider decides the full campaign graph.
   */
  entityIds?: {
    adSetIds?: string[];
    adIds?: string[];
    creativeIds?: string[];
  };
  /**
   * Opaque provider-specific options (budget overrides, dry-run flags, etc.).
   * Providers must validate their own option shapes.
   */
  options?: Record<string, unknown>;
  requestedByUserId?: string;
}

export interface PublishValidationIssue {
  code: string;
  message: string;
  entityType?: PublishEntityType;
  entityId?: string;
  field?: string;
}

export interface PublishValidationResult {
  valid: boolean;
  platform: PublisherPlatform;
  issues: PublishValidationIssue[];
}

export interface PublishEntityResult {
  entityType: PublishEntityType;
  entityId: string;
  externalId?: string;
  status: PublishStatus;
  message?: string;
}

export interface PublishResult {
  success: boolean;
  platform: PublisherPlatform;
  status: PublishStatus;
  campaignId: string;
  externalCampaignId?: string;
  entities: PublishEntityResult[];
  issues: PublishValidationIssue[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  /** Structured stage + Meta Graph diagnostics for UI debugging. */
  diagnostics?: PublishDiagnostics;
  raw?: unknown;
}

/**
 * Contract every advertising platform adapter must implement.
 * Business modules never call providers directly — use PublisherService.
 */
export interface PublisherProvider {
  readonly platform: PublisherPlatform;

  /**
   * Platform-specific validation (credentials, assets, payload readiness).
   * Must not call external publish APIs that mutate platform state.
   */
  validate(request: PublishRequest): Promise<PublishValidationResult>;

  /**
   * Publish the campaign graph (or subset) to the platform.
   */
  publish(request: PublishRequest): Promise<PublishResult>;
}
