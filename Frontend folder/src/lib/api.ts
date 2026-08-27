export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly errors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const IS_PRODUCTION = import.meta.env.PROD;

const PROD_FALLBACK = "Something went wrong. Please try again later.";

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) {
    if (error.statusCode >= 500) return IS_PRODUCTION ? PROD_FALLBACK : error.message;
    if (error.errors?.length) return error.errors.map((e) => e.message).join(" ");
    return error.message;
  }
  if (error instanceof Error) {
    if (/network error/i.test(error.message)) {
      return IS_PRODUCTION
        ? "Unable to connect. Please check your internet and try again."
        : "Cannot reach the server. Make sure the backend is running (npm run dev in the backend folder).";
    }
    return IS_PRODUCTION ? PROD_FALLBACK : error.message;
  }
  return fallback;
}
