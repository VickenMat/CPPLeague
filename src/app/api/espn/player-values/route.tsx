import { checkRateLimit } from "../../../../../lib/rate-limit";
// app/api/espn/player-values/route.ts
import { NextResponse } from "next/server";
import {
  loadPlayerIndex,
  SOURCE,
  VALUES_FILE,
} from "../../../../../lib/player-values";

export async function GET(req: Request) {
  const limited = checkRateLimit(req, "player-values", 90, 60_000);
  if (limited) return limited;
  const { searchParams } = new URL(req.url);
  if (req.url.length > 8000)
    return NextResponse.json(
      { error: "Too many player IDs." },
      { status: 400 },
    );

  // ---- Collect player IDs from ?playerIds=1,2,3 and/or ?playerId=1&playerId=2 ----
  const rawIdStrings: string[] = [];

  const csv = searchParams.get("playerIds");
  if (csv) {
    for (const part of csv.split(",")) {
      const trimmed = part.trim();
      if (trimmed) rawIdStrings.push(trimmed);
    }
  }

  const repeated = searchParams.getAll("playerId");
  for (const v of repeated) {
    const trimmed = (v ?? "").trim();
    if (trimmed) rawIdStrings.push(trimmed);
  }

  if (
    rawIdStrings.length > 250 ||
    rawIdStrings.some((id) => !/^\d{1,10}$/.test(id) || Number(id) < 1)
  ) {
    return NextResponse.json(
      { error: "Provide at most 250 valid ESPN player IDs." },
      { status: 400 },
    );
  }
  const ids = Array.from(new Set(rawIdStrings)).map(Number);

  if (!ids.length) {
    return NextResponse.json(
      {
        error:
          "No valid player IDs provided. Expected ?playerIds=1,2,3 or repeated ?playerId=1&playerId=2 …",
      },
      { status: 400 },
    );
  }

  // Base map: everyone starts at 0 so UI always has something
  const baseValues: Record<string, number> = {};
  for (const id of ids) {
    baseValues[String(id)] = 0;
  }

  try {
    const index = await loadPlayerIndex();

    const values: Record<string, number> = { ...baseValues };

    for (const id of ids) {
      const row = index.get(id);
      if (!row) continue;

      const n = Number(row.value);
      if (Number.isFinite(n)) {
        values[String(id)] = n;
      }
    }

    return NextResponse.json({
      values,
      source: SOURCE,
    });
  } catch (e: any) {
    const message =
      typeof e?.message === "string"
        ? e.message
        : `Unknown error while reading ${VALUES_FILE}`;

    // Still return zeros so the trade UI keeps working
    return NextResponse.json({
      values: baseValues,
      source: SOURCE,
      warning: message,
    });
  }
}
