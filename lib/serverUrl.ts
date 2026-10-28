// src/lib/serverUrl.ts
import 'server-only';

import { headers } from 'next/headers';

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

export async function serverBaseUrl() {
  const fallback =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? (fallback.startsWith('https://') ? 'https' : 'http');
  const host = h.get('x-forwarded-host') ?? h.get('host');

  if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    return `${proto}://${host}`;
  }

  if (fallback) {
    return normalizeBaseUrl(fallback);
  }

  return 'http://localhost:3000';
}
