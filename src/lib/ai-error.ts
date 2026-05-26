import type { AIErrorCode } from "@/types";

export class AIError extends Error {
  constructor(
    public code: AIErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "AIError";
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown;
  const delays = [2000, 4000];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      const isRateLimit =
        err instanceof Error &&
        (err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED"));

      if (!isRateLimit || attempt === maxRetries) break;

      const retryAfter =
        err instanceof Error &&
        err.message.match(/retryDelay:(\d+)/)?.[1];
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : delays[attempt];
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  if (
    lastError instanceof Error &&
    (lastError.message.includes("429") ||
      lastError.message.includes("RESOURCE_EXHAUSTED"))
  ) {
    throw new AIError("ai_rate_limit");
  }
  throw new AIError("ai_unknown", String(lastError));
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms = 30000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AIError("ai_timeout");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function handleAIError(err: unknown): Response {
  if (err instanceof AIError) {
    return Response.json({ error: err.code }, { status: 500 });
  }
  console.error("AI unexpected error:", err);
  return Response.json({ error: "ai_unknown" }, { status: 500 });
}
