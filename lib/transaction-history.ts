import { buildEspnUrl, espnHeadersForLeague, toTeamName } from "./espn";
import { fetchJson } from "./http";
import { loadPlayerIndex } from "./player-values";

type Message = {
  id?: string | number;
  messageTypeId: number;
  targetId: number;
  date?: number;
  from?: number;
  to?: number;
  for?: number;
};
type Topic = { id?: string | number; date: number; messages: Message[] };
type Team = {
  id: number;
  name?: string;
  location?: string;
  nickname?: string;
  roster?: {
    entries?: {
      playerId?: number;
      playerPoolEntry?: { player?: { id: number; fullName: string } };
    }[];
  };
};
const ACTIONS: Record<number, string> = {
  178: "Added",
  180: "Waiver add",
  179: "Dropped",
  239: "Dropped",
  181: "Dropped",
  244: "Traded",
};

export async function getTransactionHistory(leagueId: string, season: string) {
  const headers = espnHeadersForLeague({ leagueId });
  const league = await fetchJson<{
    teams: Team[];
    settings?: { name?: string };
    scoringPeriodId?: number;
  }>(buildEspnUrl(season, leagueId, ["mTeam", "mRoster", "mSettings"]), {
    headers,
  });
  if (
    !Array.isArray(league.teams) ||
    !league.teams.length ||
    league.teams.some((team) => !Array.isArray(team.roster?.entries))
  ) {
    throw new Error("Current league rosters are unavailable.");
  }
  const teams = new Map(
    league.teams.map((team) => [team.id, toTeamName(team)]),
  );
  const owners = new Map<number, string>();
  const names = new Map<number, string>();
  for (const team of league.teams) {
    for (const entry of team.roster!.entries!) {
      const player = entry.playerPoolEntry?.player;
      const id = player?.id ?? entry.playerId;
      if (id !== undefined) {
        owners.set(id, teams.get(team.id)!);
        if (player?.fullName) names.set(id, player.fullName);
      }
    }
  }

  // The season-scoped activity feed includes completed adds, drops, and trades.
  // Reference: https://github.com/cwendt94/espn-api/blob/master/espn_api/football/league.py (recent_activity).
  const communicationUrl = buildEspnUrl(season, leagueId, [
    "kona_league_communication",
  ]).replace("?", "/communication/?");
  const topics = new Map<string, Topic>();
  let offset = 0;
  let complete = false;
  for (let page = 0; page < 100; page++) {
    const data = await fetchJson<{ topics: Topic[] }>(communicationUrl, {
      headers: {
        ...headers,
        "x-fantasy-filter": JSON.stringify({
          topics: {
            filterType: { value: ["ACTIVITY_TRANSACTIONS"] },
            filterIncludeMessageTypeIds: {
              value: Object.keys(ACTIONS).map(Number),
            },
            limit: 100,
            offset,
            limitPerMessageSet: { value: 1000 },
            sortMessageDate: { sortPriority: 1, sortAsc: false },
            sortFor: { sortPriority: 2, sortAsc: false },
          },
        }),
      },
    });
    if (!Array.isArray(data.topics))
      throw new Error("ESPN did not return transaction history.");
    if (!data.topics.length) {
      complete = true;
      break;
    }
    const previousSize = topics.size;
    for (const topic of data.topics) {
      if (!Array.isArray(topic.messages))
        throw new Error("Incomplete ESPN transaction details.");
      topics.set(String(topic.id ?? JSON.stringify(topic)), topic);
    }
    if (topics.size === previousSize)
      throw new Error("ESPN repeated a transaction page. Please retry.");
    // Continue until an empty page, even when ESPN returns fewer than our requested limit.
    offset += data.topics.length;
  }
  if (!complete)
    throw new Error("The complete transaction history could not be loaded.");

  const ids = new Set<number>();
  for (const topic of topics.values())
    for (const message of topic.messages) {
      if (
        ACTIONS[message.messageTypeId] &&
        Number.isInteger(message.targetId) &&
        message.targetId !== 0
      )
        ids.add(message.targetId);
    }
  // CSV is only a name fallback; it never determines historical or current ownership.
  try {
    for (const [id, row] of await loadPlayerIndex())
      if (!names.has(id) && row.name) names.set(id, row.name);
  } catch {
    /* Names can still be resolved through ESPN. */
  }
  const missingIds = [...ids].filter((id) => !names.has(id));
  for (let offset = 0; offset < missingIds.length; offset += 100) {
    const batch = missingIds.slice(offset, offset + 100);
    try {
      const cards = await fetchJson<{
        players?: { id: number; player?: { id?: number; fullName?: string } }[];
      }>(buildEspnUrl(season, leagueId, ["kona_playercard"]), {
        headers: {
          ...headers,
          "x-fantasy-filter": JSON.stringify({
            players: {
              filterIds: { value: batch },
              limit: 100,
              sortPercOwned: { sortPriority: 1, sortAsc: false },
            },
          }),
        },
      });
      for (const entry of cards.players || [])
        if (entry.player?.fullName)
          names.set(entry.player.id ?? entry.id, entry.player.fullName);
    } catch {
      /* Keep the dated transaction even if ESPN cannot resolve its player name. */
    }
  }

  const teamName = (id?: number) =>
    id == null ? "Unknown team" : teams.get(id) || `Team ${id}`;
  const transactions = [...topics]
    .flatMap(([topicId, topic]) =>
      topic.messages.flatMap((message, index) => {
        const action = ACTIONS[message.messageTypeId];
        if (!action || !ids.has(message.targetId)) return [];
        const timestamp = message.date ?? topic.date;
        return [
          {
            id: `${topicId}:${message.id ?? index}`,
            groupId: topicId,
            date:
              Number.isFinite(timestamp) && timestamp > 0
                ? new Date(timestamp).toISOString()
                : null,
            action,
            teamId:
              message.messageTypeId === 244
                ? null
                : ((message.messageTypeId === 239 ? message.for : message.to) ??
                  null),
            team:
              message.messageTypeId === 244
                ? `${teamName(message.from)} → ${teamName(message.to)}`
                : teamName(
                    message.messageTypeId === 239 ? message.for : message.to,
                  ),
            playerId: message.targetId,
            playerName:
              names.get(message.targetId) || `Player ${message.targetId}`,
            currentTeam: owners.get(message.targetId) || "Waivers",
          },
        ];
      }),
    )
    .sort(
      (a, b) =>
        (b.date || "").localeCompare(a.date || "") || a.id.localeCompare(b.id),
    );
  const unresolvedNames = [...ids].some((id) => !names.has(id));
  return {
    transactions,
    leagueName: league.settings?.name || "CPP Fantasy Football",
    currentWeek: league.scoringPeriodId ?? null,
    teams: [...teams]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    warning: unresolvedNames
      ? "Some player names are unavailable; their ESPN IDs are shown."
      : undefined,
  };
}
