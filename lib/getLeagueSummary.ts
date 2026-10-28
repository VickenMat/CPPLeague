import { cache } from "react";
import {
  buildEspnUrl,
  espnHeadersForLeague,
  getEspnLeagueId,
  toRecordRow,
  toTeamName,
  type LeagueKey,
} from "./espn";
import { fetchJson } from "./http";
import { currentSeason } from "./league";

export const fetchLeagueData = cache(
  async (season: number, views: string[]) => {
    const leagueId = getEspnLeagueId();
    const headers = espnHeadersForLeague();
    const urls =
      season <= 2017
        ? [
            `https://fantasy.espn.com/apis/v3/games/ffl/leagueHistory/${leagueId}?${new URLSearchParams({ seasonId: String(season) })}&${views.map((v) => `view=${encodeURIComponent(v)}`).join("&")}`,
          ]
        : [
            buildEspnUrl(season, leagueId, views),
            buildEspnUrl(season, leagueId, views, false),
          ];
    for (const url of urls) {
      try {
        const payload = await fetchJson<any>(url, {
          headers,
          timeoutMs: 12000,
        });
        const data = Array.isArray(payload) ? payload[0] : payload;
        if (!data || !Array.isArray(data.teams))
          throw new Error("ESPN returned no teams.");
        return data;
      } catch {
        // ESPN exposes two hosts; try the second when the first is unavailable.
      }
    }
    throw new Error(
      `Unable to load the ${season} season from ESPN. Check the league access and credentials.`,
    );
  },
);

const summaryForSeason = cache(async (season: number) => {
  const data = await fetchLeagueData(season, [
    "mSettings",
    "mTeam",
    "mStandings",
    "mNav",
  ]);
  const ownersMap: Record<string, string> = {};
  const members = [...(data.members || []), ...(data.users || [])];
  for (const member of members) {
    const id = String(member.id ?? member.userId ?? "");
    const name =
      [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
      member.displayName ||
      member.nickname;
    if (id && name) ownersMap[id] = name;
  }
  const rawTeams: any[] = data.teams;
  const teams = rawTeams.map((team) => ({
    ...team,
    name: toTeamName(team),
    primaryOwner: team.primaryOwner || team.owners?.[0],
    displayOwner:
      (team.owners || [team.primaryOwner])
        .map((id: string) => ownersMap[id])
        .filter(Boolean)
        .join(" / ") || "Manager unavailable",
    pointsFor: Number(team.record?.overall?.pointsFor ?? 0),
    pointsAgainst: Number(team.record?.overall?.pointsAgainst ?? 0),
    finalRank:
      team.rankCalculatedFinal ?? team.finalRank ?? team.finalStanding ?? null,
  }));
  const sorted = [...teams].sort((a, b) => {
    const seedA = Number(a.playoffSeed);
    const seedB = Number(b.playoffSeed);
    if (seedA > 0 && seedB > 0) return seedA - seedB;
    const ar = a.record?.overall || {},
      br = b.record?.overall || {};
    return (
      (br.wins ?? 0) - (ar.wins ?? 0) ||
      (br.ties ?? 0) - (ar.ties ?? 0) ||
      b.pointsFor - a.pointsFor
    );
  });
  const schedule = data.settings?.scheduleSettings || {};
  return {
    leagueId: getEspnLeagueId(),
    season,
    leagueName: data.settings?.name || `League ${getEspnLeagueId()}`,
    currentWeek:
      data.scoringPeriodId ?? data.status?.currentScoringPeriodId ?? null,
    draftDate: data.settings?.draftSettings?.date ?? null,
    teamCount: teams.length,
    teams,
    standings: sorted.map((team, index) => toRecordRow(team, index + 1)),
    ownersMap,
    users: members,
    status: data.status || {},
    settings: {
      playoffTeamCount: schedule.playoffTeamCount ?? null,
      regularSeasonMatchups: schedule.matchupPeriodCount ?? null,
      lineupSlotCounts: data.settings?.rosterSettings?.lineupSlotCounts || {},
    },
    previousSeasons: (data.status?.previousSeasons || []).filter(
      (year: number) => Number.isInteger(year) && year < season,
    ),
  };
});

export async function getLeagueSummary(
  opts: {
    season?: string | number;
    leagueId?: string;
    key?: LeagueKey;
    debug?: boolean;
  } = {},
) {
  if (opts.leagueId && opts.leagueId !== getEspnLeagueId())
    throw new Error("Only the configured league is supported.");
  if (opts.key && opts.key !== "A")
    throw new Error("Only the configured league is supported.");
  const season = Number(opts.season ?? currentSeason());
  if (!Number.isInteger(season) || season < 2000 || season > 2100)
    throw new Error("Invalid season");
  return summaryForSeason(season);
}
