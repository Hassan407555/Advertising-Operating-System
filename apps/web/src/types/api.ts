export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface ApiErrorPayload {
  statusCode: number;
  message: string | string[];
  timestamp?: string;
  path?: string;
  correlationId?: string;
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
