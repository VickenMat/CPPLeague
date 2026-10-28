import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Preserve any query string (?league=A)
  const url = new URL(req.url);
  const search = url.search || '';
  const target = new URL(`/api/power-rankings/aggregate${search}`, url.origin);

  // 307 keeps method semantics if you ever POST here by accident
  return NextResponse.redirect(target, 307);
}
