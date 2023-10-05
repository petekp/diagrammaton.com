import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { env } from "~/env.mjs";
import { RateLimitExceededError } from "~/server/api/routers/errors";

import { logError } from "~/utils/log";

const redis = new Redis({
  url: env.UPSTASH_REDIS_URL,
  token: env.UPSTASH_REDIS_TOKEN,
});

const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "5 s"),
  analytics: true,
});

export async function checkRateLimit(identifier: string): Promise<boolean> {
  const { success } = await rateLimiter.limit(identifier);
  if (!success) {
    logError("Rate limiter error");
    throw new RateLimitExceededError();
  }
  return success;
}
