// app/api/espn/archive/route.ts
import {
  fetchSeasonSchedule,
  NormalizedGame,
} from "../../../../../lib/espnHistoric";
import { getLeagueSummary } from "../../../../../lib/getLeagueSummary";
import {
  currentSeason,
  validateLeagueReference,
} from "../../../../../lib/league";

const asNum = (n: any) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

function resolveTeamName(g: any, side: "home" | "away") {
  const id = g?.[`${side}TeamId`];

  const normalized = g?.[`${side}Name`];
  if (typeof normalized === "string" && normalized.trim().length)
    return normalized.trim();

  const loc = g?.[`${side}Location`];
  const nick = g?.[`${side}Nickname`];
  const joined = [loc, nick]
    .filter((x) => typeof x === "string" && x.trim().length)
    .join(" ")
    .trim();
  if (joined) return joined;

  const abbr = g?.[`${side}Abbrev`] ?? g?.[`${side}Abbreviation`];
  if (typeof abbr === "string" && abbr.trim().length) return abbr.trim();

  return id ? `Team ${id}` : "Unknown";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    validateLeagueReference(searchParams);
    const league = await getLeagueSummary();
    const toDefault = currentSeason();
    const firstSeason = Math.min(toDefault, ...league.previousSeasons);
    const from = Number(searchParams.get("from") || firstSeason);
    const to = Number(searchParams.get("to") || toDefault);
    const limit = Number(searchParams.get("limit") || 5);
    const debug = searchParams.get("debug") === "1";

    if (
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from < 2000 ||
      to > toDefault ||
      from > to ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return new Response(JSON.stringify({ error: "Invalid from/to" }), {
        status: 400,
      });
    }

    const seasonBundles: Array<{ season: number; schedule: NormalizedGame[] }> =
      [];
    const notes: string[] = [];
    const years = [
      ...new Set<number>([...league.previousSeasons, toDefault]),
    ].filter((year) => year >= from && year <= to);
    await Promise.all(
      years.map(async (y) => {
        try {
          const bundle = await fetchSeasonSchedule("A", y);
          seasonBundles.push({ season: y, schedule: bundle.schedule });
        } catch {
          notes.push(`Season ${y} could not be loaded.`);
        }
      }),
    );

    const all: any[] = seasonBundles.flatMap((b) => b.schedule || []);
    const finished = all.filter((g) => g.completed);

    const reg = finished.filter((g) => g.phase === "regular");
    const po = finished.filter((g) => g.phase === "playoffs");

    const mapGame = (g: any) => {
      const homePoints = asNum(g.homePoints);
      const awayPoints = asNum(g.awayPoints);
      return {
        season: asNum(g.season),
        week: asNum(g.week ?? g.matchupPeriodId ?? g.scoringPeriodId),
        homeTeam: resolveTeamName(g, "home"),
        awayTeam: resolveTeamName(g, "away"),
        homePoints,
        awayPoints,
        margin: Math.abs(homePoints - awayPoints),
      };
    };

    const byMarginDesc = (a: any, b: any) => b.margin - a.margin;
    const byMarginAsc = (a: any, b: any) => a.margin - b.margin;
    const byPFDesc = (a: any, b: any) => b.points - a.points;

    const blowouts = {
      regular: reg.map(mapGame).sort(byMarginDesc).slice(0, limit),
      playoffs: po.map(mapGame).sort(byMarginDesc).slice(0, limit),
    };

    const closest = {
      regular: reg
        .map(mapGame)
        .filter((r) => r.margin > 0)
        .sort(byMarginAsc)
        .slice(0, limit),
      playoffs: po
        .map(mapGame)
        .filter((r) => r.margin > 0)
        .sort(byMarginAsc)
        .slice(0, limit),
    };

    const teamScores = (games: NormalizedGame[]) =>
      games
        .flatMap((game) => [
          {
            season: game.season,
            week: game.week,
            team: game.homeName,
            points: game.homePoints,
            oppTeam: game.awayName,
          },
          {
            season: game.season,
            week: game.week,
            team: game.awayName,
            points: game.awayPoints,
            oppTeam: game.homeName,
          },
        ])
        .sort(byPFDesc)
        .slice(0, limit);
    const singlePF = { regular: teamScores(reg), playoffs: teamScores(po) };

    const seasonsFetched = seasonBundles.filter(
      (b) => b.schedule.length > 0,
    ).length;

    const teamDirBySeason: Record<
      string,
      Array<{ id: number; name: string }>
    > = {};
    for (const b of seasonBundles) {
      const map = new Map<number, string>();
      for (const g of b.schedule) {
        if (g.homeTeamId > 0) map.set(g.homeTeamId, g.homeName);
        if (g.awayTeamId > 0) map.set(g.awayTeamId, g.awayName);
      }
      teamDirBySeason[b.season] = Array.from(map.entries()).map(
        ([id, name]) => ({ id, name }),
      );
    }

    const body: any = {
      leagueId: league.leagueId,
      notes,
      range: { from, to },
      counts: {
        seasonsFetched,
        games: finished.length,
        gamesWithScores: finished.length,
      },
      blowouts,
      closest,
      singlePF,
    };

    if (debug) {
      body.teams = teamDirBySeason;
      body.notes = notes;
    }

    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify(
        { error: "archive route failed", message: err?.message || String(err) },
        null,
        2,
      ),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
