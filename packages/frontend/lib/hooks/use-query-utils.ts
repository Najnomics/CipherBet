"use client";

export function isGraphRateLimitError(error: unknown): boolean {
  if (!error) return false;

  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || message.toLowerCase().includes("too many requests");
}

export function graphRetryDecider(failureCount: number, error: unknown): boolean {
  if (isGraphRateLimitError(error)) {
    return false;
  }

  return failureCount < 1;
}
