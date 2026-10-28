import { NFL_TEAMS } from "./nfl-teams";
import { buildEspnUrl, espnHeadersForLeague, getEspnLeagueId } from "./espn";
import { fetchJson, HttpError } from "./http";
// default-position → fantasy position
const POS: Record<number, string> = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "D/ST",
};

// lineupSlotId → slot label (used for starters/bench/IR)
const SLOT: Record<number, string> = {
  0: "QB",
  2: "RB",
  3: "RB/WR",
  4: "WR",
  5: "WR/TE",
  6: "TE",
  7: "OP",
  23: "RB/WR/TE",
  16: "D/ST",
  17: "K",
  20: "BE",
  21: "IR",
};

export async function getLeagueRoster(teamId: string, season: string) {
  const leagueId = getEspnLeagueId();
  const url = buildEspnUrl(season, leagueId, ["mRoster", "mTeam"]);
  const json = await fetchJson<any>(url, {
    headers: espnHeadersForLeague({ leagueId }),
    timeoutMs: 12000,
  });

  if (!Array.isArray(json?.teams))
    throw new Error("ESPN roster data is unavailable.");
  const team = (json?.teams ?? []).find(
    (t: any) => String(t.id) === String(teamId),
  );
  if (!team) {
    throw new HttpError("Team not found", 404);
  }

  const entries = team?.roster?.entries ?? [];
  const players = entries.map((e: any) => {
    const p = e?.playerPoolEntry?.player ?? e?.player ?? {};
    const id = p.id ?? e?.playerId;
    const fullName = p.fullName ?? p.name ?? "Unknown";
    const pos = POS[p?.defaultPositionId] ?? "Other";
    const proTeamAbbrev =
      p?.proTeamAbbrev ?? p?.proTeam?.abbrev ?? NFL_TEAMS[p?.proTeamId] ?? "";
    const lineupSlotId = e?.lineupSlotId;
    const lineupSlot =
      SLOT[lineupSlotId] ??
      (lineupSlotId == null ? undefined : `Slot ${lineupSlotId}`);
    const percentOwned =
      p?.ownership?.percentOwned ?? p?.percentOwned ?? undefined;

    return {
      id,
      name: fullName,
      position: pos,
      nflTeam: proTeamAbbrev,
      lineupSlot,
      percentOwned,
    };
  });

  return {
    team: {
      id: team.id,
      name:
        (team?.location && team?.nickname
          ? `${team.location} ${team.nickname}`
          : team?.name) ?? `Team ${team.id}`,
      abbrev: team?.abbrev,
    },
    players,
  };
}
