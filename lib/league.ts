import { getEspnLeagueId } from "./espn";

export function currentSeason() {
  const season = Number(process.env.ESPN_SEASON);
  if (!Number.isInteger(season) || season < 2000 || season > 2100) {
    throw new Error("Set ESPN_SEASON in .env.local.");
  }
  return season;
}

export function leagueUrl() {
  return `https://fantasy.espn.com/football/league?leagueId=${getEspnLeagueId()}&seasonId=${currentSeason()}`;
}

export function validateLeagueReference(params: URLSearchParams) {
  const key = params.get("key") || params.get("league");
  const id = params.get("leagueId");
  if (key && key.toUpperCase() !== "A" && key !== getEspnLeagueId()) {
    throw new Error("Only the configured league is supported.");
  }
  if (id && id.toUpperCase() !== "A" && id !== getEspnLeagueId()) {
    throw new Error("Only the configured league is supported.");
  }
  return getEspnLeagueId();
}
