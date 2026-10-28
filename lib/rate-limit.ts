import { isIP } from "node:net";
import { NextResponse } from "next/server";

type BucketEntry = { count: number; resetAt: number };

/** A bounded per-process safeguard. The deployment proxy must set trusted IP headers. */
export function createRateLimiter(maxBuckets = 10_000, now = Date.now) {
  const buckets = new Map<string, BucketEntry>();
  let nextCleanup = 0;
  const prune = (time: number) => {
    for (const [key, entry] of buckets)
      if (entry.resetAt <= time) buckets.delete(key);
    nextCleanup = time + 60_000;
  };
  const tooMany = (seconds: number) =>
    NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(seconds))),
          "Cache-Control": "no-store",
        },
      },
    );
  return (req: Request, bucket: string, limit: number, windowMs: number) => {
    const time = now();
    if (time >= nextCleanup) prune(time);
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const candidate =
      forwarded ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "";
    const client = isIP(candidate) ? candidate : "unknown";
    const key = `${bucket}:${client}`;
    const current = buckets.get(key);
    if (!current || current.resetAt <= time) {
      if (!current && buckets.size >= maxBuckets) {
        prune(time);
        if (buckets.size >= maxBuckets) return tooMany(windowMs / 1000);
      }
      buckets.set(key, { count: 1, resetAt: time + windowMs });
      return null;
    }
    if (current.count >= limit) return tooMany((current.resetAt - time) / 1000);
    current.count++;
    return null;
  };
}

export const checkRateLimit = createRateLimiter();
