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

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) {
    if (error.errors?.length) return error.errors.map((e) => e.message).join(" ");
    return error.message;
  }
  if (error instanceof Error) {
    if (/network error/i.test(error.message)) {
      return "Cannot reach the server. Make sure the backend is running (npm run dev in the backend folder).";
    }
    return error.message;
  }
  return fallback;
}
