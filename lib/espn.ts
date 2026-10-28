const ESPN_READS = "https://lm-api-reads.fantasy.espn.com";
const ESPN_MAIN = "https://fantasy.espn.com";

// A is accepted only for compatibility with existing bookmarked API requests.
export type LeagueKey = "A";

export function getEspnLeagueId(): string {
  const leagueId = process.env.ESPN_LEAGUE_ID?.trim();
  if (!leagueId || !/^\d+$/.test(leagueId)) {
    throw new Error("Set ESPN_LEAGUE_ID to your ESPN league ID in .env.local.");
  }
  return leagueId;
}

function assertConfiguredLeague(leagueId?: string | number, key?: LeagueKey) {
  const configuredId = getEspnLeagueId();
  if (
    (key && key !== "A") ||
    (leagueId != null && String(leagueId) !== configuredId)
  ) {
    throw new Error("Only the configured ESPN league is supported.");
  }
  return configuredId;
}

export function buildEspnUrl(
  season: number | string,
  leagueId: number | string,
  views: string[],
  useReads = true,
) {
  const configuredId = assertConfiguredLeague(leagueId);
  const host = useReads ? ESPN_READS : ESPN_MAIN;
  const base = `${host}/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${configuredId}`;
  const params = views.map((v) => `view=${encodeURIComponent(v)}`).join("&");
  return `${base}?${params}`;
}

/** Use the single league's credentials; legacy callers can still pass its ID or A. */
export function espnHeadersForLeague(
  opts: { leagueId?: string; key?: LeagueKey } = {},
) {
  assertConfiguredLeague(opts.leagueId, opts.key);

  const s2 = process.env.ESPN_S2?.trim() || "";
  const swid = process.env.ESPN_SWID?.trim() || "";

  const headers: Record<string, string> = {
    Accept: "application/json",
    Referer: "https://fantasy.espn.com/",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
  };
  if (s2 && swid) headers["Cookie"] = `espn_s2=${s2}; SWID=${swid};`;
  return headers;
}

/* Helpers used by summary route and elsewhere */
export function toTeamName(t: any) {
  const loc = (t?.location || "").trim();
  const nick = (t?.nickname || "").trim();
  const name = (t?.name || "").trim();
  const composed = `${loc} ${nick}`.trim();
  return (composed || name || `Team ${t?.id ?? ""}`).trim();
}

export function toRecordRow(t: any, rank: number) {
  const r = t?.record?.overall || t?.record?.[0] || {};
  return {
    rank,
    teamId: t?.id,
    name: toTeamName(t),
    wins: r.wins ?? 0,
    losses: r.losses ?? 0,
    ties: r.ties ?? 0,
    pointsFor: +(r.pointsFor ?? r.points_for ?? 0),
    pointsAgainst: +(r.pointsAgainst ?? r.points_against ?? 0),
  };
}
