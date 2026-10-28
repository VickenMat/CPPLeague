import { InputError, singleParam } from "./validation";
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
  const configuredId = getEspnLeagueId();
  for (const name of ["key", "league", "leagueId"]) {
    const value = singleParam(params, name);
    if (
      value !== null &&
      value !== configuredId &&
      value.toUpperCase() !== "A"
    ) {
      throw new InputError("Only the configured league is supported.");
    }
  }
  return configuredId;
}
