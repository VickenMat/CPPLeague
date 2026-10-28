import { singleParam } from "../../../../../lib/validation";
import { validateLeagueReference } from "../../../../../lib/league";
import { NextResponse } from "next/server";
import { getTransactionHistory } from "../../../../../lib/transaction-history";
import { checkRateLimit } from "../../../../../lib/rate-limit";
import { parseSeason } from "../../../../../lib/validation";

export async function GET(req: Request) {
  const limited = checkRateLimit(req, "espn-transactions", 20, 60_000);
  if (limited) return limited;
  const params = new URL(req.url).searchParams;
  let leagueId: string;
  try {
    leagueId = validateLeagueReference(params);
  } catch {
    return NextResponse.json(
      { error: "Only the configured league is supported." },
      { status: 400 },
    );
  }
  let season: string;
  try {
    season = parseSeason(
      singleParam(params, "season"),
      process.env.ESPN_SEASON || String(new Date().getFullYear()),
    );
  } catch {
    return NextResponse.json({ error: "Invalid season." }, { status: 400 });
  }
  try {
    return NextResponse.json(
      { ...(await getTransactionHistory(leagueId, season)), season, leagueId },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to load complete transaction history from ESPN. Please retry.",
      },
      { status: 502 },
    );
  }
}
