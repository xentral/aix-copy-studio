import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODEL = "claude-sonnet-4-6";

export async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      const err = e as { status?: number };
      const retriable = err?.status === 529 || (err?.status !== undefined && err.status >= 500 && err.status < 600);
      if (!retriable || i === attempts - 1) throw e;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}
