import { NextResponse } from 'next/server';

type BucketEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, BucketEntry>();

function getNow() {
  return Date.now();
}

function clearExpiredBuckets(now: number) {
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function getClientKey(req: Request) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('user-agent') ||
    'unknown'
  );
}

export function checkRateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number,
) {
  const now = getNow();
  clearExpiredBuckets(now);

  const key = `${bucket}:${getClientKey(req)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  current.count += 1;
  buckets.set(key, current);
  return null;
}
