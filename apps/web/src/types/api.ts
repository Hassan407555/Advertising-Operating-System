export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface ApiValidationIssue {
  code?: string;
  message: string;
  entityType?: string;
  entityId?: string;
  field?: string;
}

export interface ApiErrorPayload {
  statusCode: number;
  message: string | string[];
  timestamp?: string;
  path?: string;
  correlationId?: string;
  platform?: string;
  title?: string;
  validationCode?: string;
  issues?: ApiValidationIssue[];
  diagnostics?: unknown;
  status?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
