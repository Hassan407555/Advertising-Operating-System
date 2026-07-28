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
  items: T[];
  total: number;
  page: number;
  limit: number;
}
