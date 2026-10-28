// lib/teamPeople.ts

/** Keys for convenience if you ever pass a league key instead of leagueId */
export type LeagueKey = 'A' | 'B' | 'C';

export const LEAGUE_IDS = {
  A: '23105994',
  B: '1685952483',
  C: '723900321'
} as const;

/** ---------- Owner maps ---------- */
/** Manager assignments through 2025; team IDs are reused when managers change. */
export const TEAM_PEOPLE_BY_LEAGUE: Record<string, Record<string, string>> = {
  [LEAGUE_IDS.A]: {
    '1': 'Vicken Matiossian',
    '2': 'Shant Keshishian',
    '3': 'Aren Dakessian',
    '4': 'Vadik Bagdasarian',
    '5': 'Shant Poladian',
    '6': 'Vasken Kebabjian',
    '9': 'Armen Surenian',
    '10': 'Aren Banklian',
    '11': 'Violette Dekirmenjian',
    '12': 'Raphael Yeremian',
    '13': 'Garen Soukiasian',
    '14': 'Andy Sisitzky',
  },
  [LEAGUE_IDS.B]: {
    '1': 'Vicken Matiossian',
    '2': 'Aleena Surenian/Alina Dekirmenjian',
    '4': 'Gregory Cormier',
    '6': 'Vahey Mouradian',
    '7': 'Jacob Naroian',
    '8': 'Kevork DerKevorkian',
    '9': 'Alec Peltekian',
    '10': 'Hampton Trout',
    '11': 'Alec Soghomonian',
    '12': 'Ara Changelian',
    '13': 'Nareg Aboyan',
    '14': 'Njteh Hovsepian',
  },
    [LEAGUE_IDS.C]: {
    '1': 'Vicken Matiossian',
    '2': 'Alex Matiossian',
    '3': 'Garo Bazarbachian',
    '4': 'Alexis Cormier',
    '5': 'Shahe Der Torossian',
    '6': 'Shant Alashaian',
    '7': 'Karyl Ashjian',
    '8': 'Daron Hovsepian',
    '9': 'Tadeh Derstepanian',
    '10': 'Sevan Soukiasian',
    '11': 'Ardo Nashalian',
    '12': 'Alina Keshishian',
    },
};

/** 2026 assignments verified against ESPN team IDs and the league membership list. */
export const TEAM_PEOPLE_2026_BY_LEAGUE: Record<string, Record<string, string>> = {
  [LEAGUE_IDS.A]: {
    '1': 'Vicken Matiossian',
    '2': 'Alec Peltekian',
    '3': 'Aren Dakessian',
    '4': 'Jacob Naroian',
    '5': 'Shant Poladian',
    '6': 'Gregory Cormier',
    '9': 'Nareg Aboyan',
    '10': 'Aren Banklian',
    '11': 'Violette Dekirmenjian',
    '12': 'Raphael Yeremian',
    '13': 'Garen Soukiasian',
    '14': 'Andy Sisitzky',
  },
  [LEAGUE_IDS.B]: {
    '1': 'Vicken Matiossian',
    '2': 'Alex Matiossian',
    '4': 'Vadik Bagdasarian',
    '6': 'Vahey Mouradian',
    '7': 'Armen Surenian',
    '8': 'Kevork DerKevorkian',
    '9': 'Tadeh Derstepanian',
    '10': 'Shant Alashaian',
    '11': 'Alec Soghomonian',
    '12': 'Ara Changelian',
    '13': 'Vasken Kebabjian',
    '14': 'Garo Bazarbachian',
  },
  [LEAGUE_IDS.C]: {
    '1': 'Vicken Matiossian',
    '2': 'Brianna Lundin',
    '3': 'Alex Abrahamyan',
    '4': 'Ara Naroian',
    '5': 'Parker Harrington',
    '6': 'Armen Krikorian',
    '7': 'Karyl Ashjian',
    '8': 'Daron Hovsepian',
    '9': 'Alec Maserejian',
    '10': 'Hampton Trout',
    '11': 'Anto Atinizian',
    '12': 'Njteh Hovsepian',
  },
};

/** Optional global id map (used only if you want a fallback without league) */
export const TEAM_PEOPLE_BY_ID: Record<string, string> = {
  // '7': 'Example Owner',
};

/** Optional name map (case-insensitive fallback) */
export const TEAM_PEOPLE_BY_NAME: Record<string, string> = {
  'COMIN OUT': 'Vicken Matiossian',
  'BANKS ALWAYS OPEN' : 'Aren Banklian'
};

const norm = (s?: string) => (s || '').trim().toLowerCase();
const toId = (v: string | number | undefined) =>
  v === undefined || v === null ? undefined : String(v).trim();
const toLeagueId = (v?: string | LeagueKey) =>
  v === 'A' ? LEAGUE_IDS.A : v === 'B' ? LEAGUE_IDS.B : v === 'C' ? LEAGUE_IDS.C : toId(v);

/**
 * Return the real person name for a team.
 * Priority:
 * 1) season-aware, league-scoped teamId (pass leagueId OR league: 'A'|'B'|'C')
 * 2) global teamId (optional)
 * 3) teamName (case-insensitive)
 */
export function personForTeam(opts: {
  teamId?: string | number;
  teamName?: string;
  leagueId?: string;   // e.g. '23105994'
  league?: LeagueKey;  // e.g. 'A' | 'B'
  season?: string | number;
}): string | undefined {
  const tid = toId(opts.teamId);
  const lid = toLeagueId(opts.leagueId ?? opts.league);

  // 1) Per-league teamId
  if (tid && lid) {
    const assignments = Number(opts.season) >= 2026
      ? TEAM_PEOPLE_2026_BY_LEAGUE
      : TEAM_PEOPLE_BY_LEAGUE;
    const scoped = assignments[lid];
    if (scoped && scoped[tid]) return scoped[tid];
  }

  // 2) Global id fallback (rare)
  if (tid && TEAM_PEOPLE_BY_ID[tid]) return TEAM_PEOPLE_BY_ID[tid];

  // 3) Name fallback
  if (opts.teamName) {
    const key = Object.keys(TEAM_PEOPLE_BY_NAME).find((k) => norm(k) === norm(opts.teamName));
    if (key) return TEAM_PEOPLE_BY_NAME[key];
  }

  return undefined;
}
