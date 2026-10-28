import { fetchLeagueData } from "./getLeagueSummary";
import { currentSeason } from "./league";

type Value = string | number | boolean | null | undefined;
export type RuleRow = { label: string; value: string | number };
export function ruleRows(rows: [string, Value][]): RuleRow[] {
  return rows
    .filter(
      ([, value]) =>
        value !== 0 && value !== null && value !== undefined && value !== "",
    )
    .map(([label, value]) => ({
      label,
      value:
        typeof value === "boolean"
          ? value
            ? "Yes"
            : "No"
          : (value as string | number),
    }));
}
const SLOT_NAMES: Record<number, [string, number?]> = {
  0: ["Quarterback (QB)", 1],
  1: ["Team Quarterback (TQB)"],
  2: ["Running Back (RB)", 2],
  3: ["Running Back/Wide Receiver (RB/WR)"],
  4: ["Wide Receiver (WR)", 3],
  5: ["Wide Receiver/Tight End (WR/TE)"],
  6: ["Tight End (TE)", 4],
  7: ["Superflex (SFLEX)"],
  8: ["Defensive Tackle (DT)"],
  9: ["Defensive End (DE)"],
  10: ["Linebacker (LB)"],
  11: ["Defensive Line (DL)"],
  12: ["Cornerback (CB)"],
  13: ["Safety (S)"],
  14: ["Defensive Back (DB)"],
  15: ["Defensive Player Utility (DP)"],
  16: ["Team Defense/Special Teams (D/ST)", 16],
  17: ["Place Kicker (K)", 5],
  18: ["Punter (P)"],
  19: ["Head Coach (HC)"],
  20: ["Bench (BE)"],
  21: ["Injured Reserve (IR)"],
  23: ["Flex (FLEX)"],
};
// ESPN stat IDs, labeled to match the supplied league-settings screenshots.
const PASSING: [number, string][] = [
  [3, "Passing Yards (PY)"],
  [4, "TD Pass (PTD)"],
  [20, "Interceptions Thrown (INT)"],
  [19, "2pt Passing Conversion (2PC)"],
];
const RUSHING: [number, string][] = [
  [24, "Rushing Yards (RY)"],
  [25, "TD Rush (RTD)"],
  [26, "2pt Rushing Conversion (2PR)"],
];
const RECEIVING: [number, string][] = [
  [42, "Receiving Yards (REY)"],
  [53, "Each Reception (REC)"],
  [43, "TD Reception (RETD)"],
  [44, "2pt Receiving Conversion (2PRE)"],
];
const KICKING: [number, string][] = [
  [86, "Each PAT Made (PAT)"],
  [85, "Total FG Missed (FGM)"],
  [214, "FG Made Yards (FGY)"],
];
const RETURNS: [number, string][] = [
  [102, "Kickoff Return TD (KRTD)"],
  [103, "Punt Return TD (PRTD)"],
  [101, "Interception Return TD (INTTD)"],
  [104, "Fumble Return TD (FRTD)"],
  [93, "Blocked Punt or FG Return for TD (BLKKRTD)"],
  [206, "2pt Return (2PTRET)"],
  [209, "1pt Safety (1PSF)"],
];
const DEFENSE: [number, string][] = [
  ...RETURNS,
  [99, "Each Sack (SK)"],
  [97, "Blocked Punt, PAT or FG (BLKK)"],
  [96, "Each Interception (INT)"],
  [95, "Each Fumble Recovered (FR)"],
  [98, "Each Safety (SF)"],
  [89, "0 Points Allowed (PA0)"],
  [90, "1–6 Points Allowed (PA1)"],
  [91, "7–13 Points Allowed (PA7)"],
  [92, "14–17 Points Allowed (PA14)"],
  [121, "18–21 Points Allowed (PA18)"],
  [122, "22–27 Points Allowed (PA22)"],
  [123, "28–34 Points Allowed (PA28)"],
  [124, "35–45 Points Allowed (PA35)"],
  [125, "46+ Points Allowed (PA46)"],
  [128, "Less Than 100 Total Yards Allowed (YA100)"],
  [129, "100–199 Total Yards Allowed (YA199)"],
  [130, "200–299 Total Yards Allowed (YA299)"],
  [131, "300–349 Total Yards Allowed (YA349)"],
  [132, "350–399 Total Yards Allowed (YA399)"],
  [133, "400–449 Total Yards Allowed (YA449)"],
  [134, "450–499 Total Yards Allowed (YA499)"],
  [135, "500–549 Total Yards Allowed (YA549)"],
  [136, "550+ Total Yards Allowed (YA550)"],
];
const MISC: [number, string][] = [
  RETURNS[0],
  RETURNS[1],
  [63, "Fumble Recovered for TD (FTD)"],
  [72, "Total Fumbles Lost (FUML)"],
  ...RETURNS.slice(2),
];
const unlimited = (value: number | undefined) =>
  value === -1 ? "No limit" : value;
const yesNo = (value: boolean | undefined) =>
  value === undefined ? undefined : value ? "Yes" : "No";
const days = (hours: number | undefined) =>
  hours
    ? hours % 24 === 0
      ? `${hours / 24} ${hours === 24 ? "day" : "days"}`
      : `${hours} hours`
    : undefined;
const date = (value: number | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(value))
    : undefined;

export function buildLeagueRules(data: any, season: number) {
  const settings = data.settings || {},
    roster = settings.rosterSettings || {},
    draft = settings.draftSettings || {},
    scoring = settings.scoringSettings || {},
    acquisition = settings.acquisitionSettings || {},
    trade = settings.tradeSettings || {},
    schedule = settings.scheduleSettings || {};
  const items: Map<number, any> = new Map(
    (scoring.scoringItems || []).map((item: any) => [
      Number(item.statId),
      item,
    ]),
  );
  const points = (id: number, defense = false) => {
    const item = items.get(id);
    return defense
      ? (item?.pointsOverrides?.["16"] ?? item?.points)
      : item?.points;
  };
  const groups = [
    ["Passing", PASSING, false],
    ["Rushing", RUSHING, false],
    ["Receiving", RECEIVING, false],
    ["Kicking", KICKING, false],
    ["Team Defense / Special Teams", DEFENSE, true],
    ["Miscellaneous", MISC, false],
  ] as const;
  const scoringGroups: { title: string; rows: RuleRow[] }[] = groups
    .map(([title, stats, isDefense]) => ({
      title,
      rows: ruleRows(
        stats.map(([id, label]) => [label, points(id, isDefense)]),
      ),
    }))
    .filter((group) => group.rows.length);
  const known = new Set(groups.flatMap(([, stats]) => stats.map(([id]) => id)));
  const extra = ruleRows(
    [...items]
      .filter(([id]) => !known.has(id))
      .map(([id, item]) => [`ESPN scoring stat ${id}`, item.points]),
  );
  if (extra.length)
    scoringGroups.push({ title: "Additional Scoring", rows: extra });
  const activeSlots = Object.entries(roster.lineupSlotCounts || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([slot, count]) => {
      const [position, positionId] = SLOT_NAMES[Number(slot)] || [
        `Position ${slot}`,
      ];
      const maximum =
        positionId === undefined
          ? undefined
          : roster.positionLimits?.[String(positionId)];
      return {
        slot: Number(slot),
        position,
        count: Number(count),
        maximum: maximum === -1 ? "No limit" : maximum > 0 ? maximum : "N/A",
      };
    });
  const receptionPoints = points(53);
  const sections = [
    {
      title: "Basic Settings",
      rows: ruleRows([
        ["League Name", settings.name],
        ["Number of Teams", settings.size ?? data.teams?.length],
        [
          "Scoring Type",
          scoring.scoringType === "H2H_POINTS"
            ? `Head to Head Points${receptionPoints ? `, ${receptionPoints} Points Per Reception` : ""}`
            : scoring.scoringType,
        ],
        ["Format", "League Manager"],
        ["Make League Viewable to Public", yesNo(settings.isPublic)],
        ["Auto Reactivate", yesNo(settings.isAutoReactivate)],
        [
          "Lineup Protection",
          roster.autoPilotTypeSupported === "NONE"
            ? "Off"
            : roster.autoPilotTypeSupported,
        ],
      ]),
    },
    {
      title: "Draft Settings",
      rows: ruleRows([
        ["Draft Type", draft.type === "SNAKE" ? "Snake" : draft.type],
        ["Draft Date", date(draft.date)],
        [
          "Time Per Pick",
          draft.timePerSelection
            ? `${draft.timePerSelection} seconds`
            : undefined,
        ],
        [
          "Draft Order",
          draft.orderType === "MANUAL"
            ? "Manually Set by League Manager"
            : draft.orderType,
        ],
        ["Allow Draft Pick Trading", yesNo(draft.isTradingEnabled)],
      ]),
    },
    {
      title: "Player Rules",
      rows: ruleRows([
        [
          "Observe ESPN’s Undroppable Players List",
          yesNo(roster.isUsingUndroppableList),
        ],
        [
          "Player Universe",
          Array.isArray(roster.universeIds) && roster.universeIds.includes(0)
            ? "NFL"
            : undefined,
        ],
      ]),
    },
    {
      title: "Acquisition and Waiver Rules",
      rows: ruleRows([
        [
          "Lineup Changes",
          roster.lineupLocktimeType === "INDIVIDUAL_GAME"
            ? "Lock individually at scheduled game time"
            : roster.lineupLocktimeType,
        ],
        [
          "Player Acquisition System",
          acquisition.isUsingAcquisitionBudget
            ? "Free Agent Budget"
            : acquisition.acquisitionType,
        ],
        ["Season Acquisition Limit", unlimited(acquisition.acquisitionLimit)],
        ["Waiver Period", days(acquisition.waiverHours)],
        ["Player Acquisition Budget", acquisition.acquisitionBudget],
        ["Minimum Offer", acquisition.minimumBid],
        [
          "Free Agent Budget Tiebreaker",
          acquisition.waiverOrderReset
            ? "Reset each week to inverse order of standings"
            : undefined,
        ],
        [
          "Lock Transactions for Eliminated Teams During Playoffs",
          yesNo(acquisition.transactionLockingEnabled),
        ],
      ]),
    },
    {
      title: "Trade Rules",
      rows: ruleRows([
        ["Trade Limit", unlimited(trade.max)],
        ["Trade Deadline", date(trade.deadlineDate)],
        ["Trade Review Period", days(trade.revisionHours)],
        ["Votes Required to Veto Trade", trade.vetoVotesRequired],
      ]),
    },
    {
      title: "Keeper Rules",
      rows: ruleRows([
        [`Keepers Per Team for ${season}`, draft.keeperCount],
        [`Keepers Per Team for ${season + 1}`, draft.keeperCountFuture],
      ]),
    },
    {
      title: "Regular Season Setup",
      rows: ruleRows([
        [
          "Start of Regular Season",
          data.status?.firstScoringPeriod
            ? `NFL Week ${data.status.firstScoringPeriod}${data.status.firstScoringPeriod === 1 ? " (Start of Season)" : ""}`
            : undefined,
        ],
        ["Weeks Per Matchup", schedule.matchupPeriodLength],
        ["Regular Season Matchups", schedule.matchupPeriodCount],
        [
          "Matchup Tie Breaker",
          scoring.matchupTieRule === "NONE"
            ? "No tie breakers"
            : scoring.matchupTieRule,
        ],
        ["Home Field Advantage", scoring.homeTeamBonus],
      ]),
    },
    {
      title: "Playoff Bracket Setup",
      rows: ruleRows([
        ["Playoff Teams", schedule.playoffTeamCount],
        [
          "Weeks in Round 1 Playoff Matchup",
          schedule.playoffMatchupPeriodLength,
        ],
        [
          "Weeks in Round 2 Playoff Matchup",
          schedule.playoffMatchupPeriodLength,
        ],
        ["Weeks in Championship Round", schedule.playoffMatchupPeriodLength],
        [
          "Playoff Seeding Tie Breaker",
          schedule.playoffSeedingRule === "TOTAL_POINTS_SCORED"
            ? "Total points for"
            : schedule.playoffSeedingRule,
        ],
        ["Playoff Home Field Advantage", scoring.playoffHomeTeamBonus],
        [
          "Allow for Playoff Bracket Reseeding",
          schedule.playoffReseed === undefined
            ? undefined
            : schedule.playoffReseed
              ? "On"
              : "Off",
        ],
        [
          "Lock Transactions for Eliminated Teams During Playoffs",
          yesNo(acquisition.transactionLockingEnabled),
        ],
        [
          "Consolation Ladder",
          schedule.consolationLadderDisabled === undefined
            ? undefined
            : !schedule.consolationLadderDisabled,
        ],
      ]),
    },
  ].filter((section) => section.rows.length);
  return {
    sections,
    scoringGroups,
    roster: activeSlots,
    rosterSummary: ruleRows([
      [
        "Roster Size",
        activeSlots
          .filter((slot) => slot.slot !== 21)
          .reduce((sum, slot) => sum + slot.count, 0),
      ],
      [
        "Total Starters",
        activeSlots
          .filter((slot) => ![20, 21].includes(slot.slot))
          .reduce((sum, slot) => sum + slot.count, 0),
      ],
      ["Total on Bench", roster.lineupSlotCounts?.["20"]],
    ]),
    divisions: (schedule.divisions || []).map((division: any) => ({
      name: division.name,
      teams: (data.teams || [])
        .filter((team: any) => team.divisionId === division.id)
        .map(
          (team: any) =>
            team.name ||
            `${team.location || ""} ${team.nickname || ""}`.trim() ||
            `Team ${team.id}`,
        ),
    })),
  };
}
export async function getLeagueRules() {
  const season = currentSeason();
  return buildLeagueRules(
    await fetchLeagueData(season, ["mSettings", "mTeam"]),
    season,
  );
}
