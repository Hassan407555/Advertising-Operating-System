export interface AuditEvent {
  action: string;
  resourceType: string;
  resourceId?: string;
  organizationId?: string;
  actorId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}
