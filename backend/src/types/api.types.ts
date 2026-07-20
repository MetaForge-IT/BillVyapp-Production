/**
 * Standard API response contracts for the Salon Management backend.
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
  meta?: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: ApiValidationError[];
  stack?: string;
}

export interface ApiResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiValidationError {
  field: string;
  message: string;
}

/** @deprecated Legacy health-check shape — migrate endpoints to ApiSuccessResponse over time */
export interface HealthResponse {
  status: string;
  message: string;
}
