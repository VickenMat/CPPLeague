import { unstable_cache } from "next/cache";
import { InputError, parseInteger, singleParam } from "./validation";
import { fetchSeasonSchedule, NormalizedGame } from "./espnHistoric";
import { getLeagueSummary } from "./getLeagueSummary";
import { currentSeason, validateLeagueReference } from "./league";

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

export async function getMatchupArchive(searchParams = new URLSearchParams()) {
  validateLeagueReference(searchParams);
  const toDefault = currentSeason();
  const rawFrom = singleParam(searchParams, "from"),
    rawTo = singleParam(searchParams, "to");
  const selectedFrom =
    rawFrom === null
      ? undefined
      : parseInteger(rawFrom, "from", 2000, toDefault);
  const to = parseInteger(rawTo, "to", 2000, toDefault, toDefault);
  const limit = parseInteger(
    singleParam(searchParams, "limit"),
    "limit",
    1,
    100,
    5,
  );
  if (selectedFrom !== undefined && selectedFrom > to)
    throw new InputError("Invalid season range");
  const league = await getLeagueSummary();
  const firstSeason = Math.min(toDefault, ...league.previousSeasons);
  const from = selectedFrom ?? firstSeason;
  if (from > to) throw new InputError("Invalid season range");

  const seasonBundles: Array<{ season: number; schedule: NormalizedGame[] }> =
    [];
  const notes: string[] = [];
  const years = [
    ...new Set<number>([...league.previousSeasons, toDefault]),
  ].filter((year) => year >= from && year <= to);
  await Promise.all(
    years.map(async (y) => {
      try {
        const bundle = await unstable_cache(
          () => fetchSeasonSchedule("A", y),
          ["league-schedule-v1", league.leagueId, String(y)],
          { revalidate: y < toDefault ? 3600 : 60 },
        )();
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

  return body;
}
