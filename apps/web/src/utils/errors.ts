import { AppError } from "@/lib/api/errors";

export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
