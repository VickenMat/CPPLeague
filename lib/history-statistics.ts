import { getLeagueHistory } from "./league-history";
import { currentSeason, validateLeagueReference } from "./league";
import { InputError, parseInteger, singleParam } from "./validation";

type Raw = Record<string, string | number | null>;
type Row = {
  season: number;
  rank: number;
  owner: string;
  team: string;
  wins: number;
  losses: number;
  ties: number;
  pf: number;
  pa: number;
  ppg?: number;
  pag?: number;
  diff: number;
  moves?: number;
  playoffTeams?: number;
};

type Leader = {
  owner: string;
  pf: number;
  pa: number;
  wins: number;
  losses: number;
  ties: number;
  seasons: number;
  titles: number;
  avgPF: number;
  winPct: number;
};

/* ----------------------------- small helpers ----------------------------- */
const canon = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const toNum = (v: any): number => {
  if (v == null) return NaN;
  const s = String(v).replace(/[,\s]/g, "").replace(/[—–]/g, "-").trim();
  return /^[-+]?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};
const parseRecord = (rec?: string) => {
  const m = String(rec || "").match(/(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?/);
  return { w: m ? +m[1] : 0, l: m ? +m[2] : 0, t: m && m[3] ? +m[3] : 0 };
};
const stddev = (nums: number[]) => {
  if (!nums.length) return NaN;
  const m = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Math.sqrt(nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length);
};
const rollingK = <T>(
  items: T[],
  k: number,
  season: (x: T) => number,
  val: (x: T) => number,
) => {
  const out: { from: number; to: number; avg: number }[] = [];
  for (let i = 0; i + k - 1 < items.length; i++) {
    const a = items[i],
      b = items[i + k - 1];
    let ok = true;
    for (let j = i; j < i + k - 1; j++)
      if (season(items[j + 1]) !== season(items[j]) + 1) ok = false;
    if (!ok) continue;
    const slice = items.slice(i, i + k);
    const nums = slice.map(val);
    if (nums.every(Number.isFinite))
      out.push({
        from: season(a),
        to: season(b),
        avg: nums.reduce((x, y) => x + y, 0) / k,
      });
  }
  return out;
};

/* ------------------------------ normalization ----------------------------- */
function firstKey(o: Raw, names: string[]): string | null {
  const map = new Map(Object.keys(o).map((k) => [canon(k), k]));
  for (const n of names) {
    const k = map.get(canon(n));
    if (k) return k;
  }
  return null;
}

function normalizeOne(r: Raw): Row | null {
  const yKey = firstKey(r, ["Year", "Season"]);
  if (!yKey) return null;
  const yVal = String(r[yKey] ?? "");
  if (canon(yVal) === "year" || canon(yVal) === "season") return null;

  const season = toNum(r[yKey]);
  const rank = toNum(
    r[firstKey(r, ["Rank", "Place", "Final", "Final Rank", "#"]) ?? ""],
  );
  const owner = String(
    r[firstKey(r, ["Name", "Owner", "Owner Name", "Manager"]) ?? ""] ?? "",
  ).trim();
  const team = String(r[firstKey(r, ["Team", "Team Name"]) ?? ""] ?? "").trim();

  const recKey = firstKey(r, ["Record"]);
  const {
    w: wRec,
    l: lRec,
    t: tRec,
  } = parseRecord(recKey && r[recKey] != null ? String(r[recKey]) : undefined);
  const wins = Number.isFinite(toNum(r[firstKey(r, ["W", "Wins"]) ?? ""]))
    ? toNum(r[firstKey(r, ["W", "Wins"]) ?? ""])
    : wRec;
  const losses = Number.isFinite(toNum(r[firstKey(r, ["L", "Losses"]) ?? ""]))
    ? toNum(r[firstKey(r, ["L", "Losses"]) ?? ""])
    : lRec;
  const ties = Number.isFinite(toNum(r[firstKey(r, ["T", "Ties"]) ?? ""]))
    ? toNum(r[firstKey(r, ["T", "Ties"]) ?? ""])
    : tRec;

  const pf = toNum(r[firstKey(r, ["PF", "Points For"]) ?? ""]);
  const pa = toNum(r[firstKey(r, ["PA", "Points Against"]) ?? ""]);
  const ppg = toNum(r[firstKey(r, ["PF/G", "PF per Game", "PFPG"]) ?? ""]);
  const pag = toNum(r[firstKey(r, ["PA/G", "PA per Game", "PAPG"]) ?? ""]);
  let diff = toNum(
    r[firstKey(r, ["DIFF", "Differential", "PF-PA", "PF – PA", "PF—PA"]) ?? ""],
  );
  if (!Number.isFinite(diff) && Number.isFinite(pf) && Number.isFinite(pa))
    diff = pf - pa;
  const moves = toNum(r[firstKey(r, ["MOVES", "Moves", "Transactions"]) ?? ""]);

  if (!Number.isFinite(season) || !Number.isFinite(rank) || !owner) return null;
  if (!Number.isFinite(pf) || !Number.isFinite(pa)) return null;

  return {
    playoffTeams: Number(r.PlayoffTeams) || undefined,
    season,
    rank,
    owner,
    team,
    wins: Number.isFinite(wins) ? wins : 0,
    losses: Number.isFinite(losses) ? losses : 0,
    ties: Number.isFinite(ties) ? ties : 0,
    pf,
    pa,
    ppg: Number.isFinite(ppg) ? ppg : undefined,
    pag: Number.isFinite(pag) ? pag : undefined,
    diff: Number.isFinite(diff) ? diff : pf - pa,
    moves: Number.isFinite(moves) ? moves : undefined,
  };
}

/* -------------------------------- API GET ------------------------------- */
export async function getHistoryStatistics(
  searchParams = new URLSearchParams(),
) {
  const leagueId = validateLeagueReference(searchParams);
  const fromValue = singleParam(searchParams, "from"),
    toValue = singleParam(searchParams, "to");
  const from =
    fromValue === null
      ? undefined
      : parseInteger(fromValue, "from", 2000, currentSeason());
  const to =
    toValue === null
      ? undefined
      : parseInteger(toValue, "to", 2000, currentSeason());
  if (from !== undefined && to !== undefined && from > to)
    throw new InputError("Invalid season range");
  const { raw, notes } = await getLeagueHistory();

  const rows: Row[] = [];
  for (const r of raw) {
    const n = normalizeOne(r);
    if (!n) continue;
    if (from && n.season < from) continue;
    if (to && n.season > to) continue;
    rows.push(n);
  }

  // seasons (group + sort + champion)
  const seasonsMap = new Map<number, Row[]>();
  for (const r of rows) {
    const arr = seasonsMap.get(r.season) ?? [];
    arr.push(r);
    seasonsMap.set(r.season, arr);
  }
  const seasons = [...seasonsMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([season, arr]) => {
      const list = arr.slice().sort((a, b) => a.rank - b.rank);
      const champ = list.find((x) => x.rank === 1) || null;
      return {
        season,
        champion: champ
          ? {
              owner: champ.owner,
              team: champ.team,
              wins: champ.wins,
              losses: champ.losses,
              ties: champ.ties,
              pf: champ.pf,
              pa: champ.pa,
            }
          : null,
        standings: list.map((s) => ({
          rank: s.rank,
          owner: s.owner,
          team: s.team,
          wins: s.wins,
          losses: s.losses,
          ties: s.ties,
          pf: s.pf,
          pa: s.pa,
          diff: s.diff,
          ppg: s.ppg,
          pag: s.pag,
          moves: s.moves,
        })),
      };
    });

  // leaders
  const byOwner = new Map<string, Leader>();
  for (const r of rows) {
    const L = byOwner.get(r.owner) ?? {
      owner: r.owner,
      pf: 0,
      pa: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      seasons: 0,
      titles: 0,
      avgPF: 0,
      winPct: 0,
    };
    L.pf += r.pf;
    L.pa += r.pa;
    L.wins += r.wins;
    L.losses += r.losses;
    L.ties += r.ties;
    L.seasons += 1;
    if (r.rank === 1) L.titles += 1;
    byOwner.set(r.owner, L);
  }
  for (const L of byOwner.values()) {
    L.avgPF = L.seasons ? L.pf / L.seasons : 0;
    const g = L.wins + L.losses + L.ties;
    L.winPct = g ? (L.wins + 0.5 * L.ties) / g : 0;
  }
  const leaders = [...byOwner.values()].sort((a, b) => b.pf - a.pf);

  const champs = rows.filter((r) => r.rank === 1);
  const nonChamps = rows.filter((r) => r.rank !== 1);

  const findings: any = {
    bestSeasonPF: null,
    highestPFNoTitle: null,
    mostTitlesWinners: [] as any[],
    champMostWins: null,
    champLeastWins: null,
    champHighestPF: null,
    champLowestPF: null,
    champBestDiff: null,
    mostMovesSeason: null,
    biggestYoY: null,
    biggestDrop: null,
    rollingPF3Best: null,
    rollingPF3Worst: null,
    rollingWin3Best: null,
    mostConsistent: null,
    mostVolatile: null,
    bestDefense: null,
    bestRecordSeason: null,
    bestDiffSeason: null,
    worstDiffSeason: null,
    mostMiddling: null,
    mostMovesLowestRank: null,
    overachiever: null,
    underachiever: null,
  };

  for (const r of rows) {
    if (!findings.bestSeasonPF || r.pf > findings.bestSeasonPF.pf)
      findings.bestSeasonPF = { owner: r.owner, pf: r.pf, season: r.season };
  }
  for (const r of nonChamps) {
    if (!findings.highestPFNoTitle || r.pf > findings.highestPFNoTitle.pf)
      findings.highestPFNoTitle = {
        owner: r.owner,
        pf: r.pf,
        season: r.season,
      };
  }

  const titlesMap = new Map<string, number[]>();
  for (const s of seasons)
    if (s.champion)
      titlesMap.set(s.champion.owner, [
        ...(titlesMap.get(s.champion.owner) || []),
        s.season,
      ]);
  let maxTitles = 0;
  for (const arr of titlesMap.values())
    maxTitles = Math.max(maxTitles, arr.length);
  findings.mostTitlesWinners = [...titlesMap.entries()]
    .filter(([, yrs]) => yrs.length === maxTitles && maxTitles > 0)
    .map(([owner, yrs]) => ({
      owner,
      titles: yrs.length,
      years: yrs.sort((a, b) => a - b),
    }))
    .sort((a, b) => a.owner.localeCompare(b.owner));

  for (const r of champs) {
    if (
      !findings.champMostWins ||
      r.wins > findings.champMostWins.wins ||
      (r.wins === findings.champMostWins.wins &&
        r.pf > findings.champMostWins.pf)
    )
      findings.champMostWins = {
        owner: r.owner,
        wins: r.wins,
        pf: r.pf,
        season: r.season,
      };
    if (
      !findings.champLeastWins ||
      r.wins < findings.champLeastWins.wins ||
      (r.wins === findings.champLeastWins.wins &&
        r.pf < findings.champLeastWins.pf)
    )
      findings.champLeastWins = {
        owner: r.owner,
        wins: r.wins,
        pf: r.pf,
        season: r.season,
      };
    if (!findings.champHighestPF || r.pf > findings.champHighestPF.pf)
      findings.champHighestPF = {
        owner: r.owner,
        pf: r.pf,
        season: r.season,
      };
    if (!findings.champLowestPF || r.pf < findings.champLowestPF.pf)
      findings.champLowestPF = { owner: r.owner, pf: r.pf, season: r.season };
    const d = Number.isFinite(r.diff) ? r.diff : r.pf - r.pa;
    if (
      Number.isFinite(d) &&
      (!findings.champBestDiff || d > findings.champBestDiff.diff)
    )
      findings.champBestDiff = {
        owner: r.owner,
        diff: +d.toFixed(2),
        season: r.season,
      };
  }

  for (const r of rows) {
    if (!Number.isFinite(r.moves as number)) continue;
    if (
      !findings.mostMovesSeason ||
      (r.moves as number) > findings.mostMovesSeason.moves
    )
      findings.mostMovesSeason = {
        owner: r.owner,
        moves: r.moves,
        season: r.season,
        rank: r.rank,
      };
  }

  const owners = [...new Set(rows.map((r) => r.owner))];
  for (const o of owners) {
    const seq = rows
      .filter((r) => r.owner === o)
      .sort((a, b) => a.season - b.season);
    for (let i = 1; i < seq.length; i++) {
      const d = +(seq[i].pf - seq[i - 1].pf).toFixed(2);
      if (!findings.biggestYoY || d > findings.biggestYoY.delta)
        findings.biggestYoY = {
          owner: o,
          delta: d,
          from: seq[i - 1].season,
          to: seq[i].season,
        };
      if (!findings.biggestDrop || d < findings.biggestDrop.delta)
        findings.biggestDrop = {
          owner: o,
          delta: d,
          from: seq[i - 1].season,
          to: seq[i].season,
        };
    }
  }

  for (const o of owners) {
    const seq = rows
      .filter((r) => r.owner === o)
      .sort((a, b) => a.season - b.season);
    for (const w of rollingK(
      seq,
      3,
      (r) => r.season,
      (r) => r.pf,
    )) {
      if (!findings.rollingPF3Best || w.avg > findings.rollingPF3Best.avgPF)
        findings.rollingPF3Best = {
          owner: o,
          avgPF: +w.avg.toFixed(2),
          from: w.from,
          to: w.to,
        };
      if (!findings.rollingPF3Worst || w.avg < findings.rollingPF3Worst.avgPF)
        findings.rollingPF3Worst = {
          owner: o,
          avgPF: +w.avg.toFixed(2),
          from: w.from,
          to: w.to,
        };
    }
    for (const w of rollingK(
      seq,
      3,
      (r) => r.season,
      (r) => {
        const g = r.wins + r.losses + r.ties;
        return g ? (r.wins + 0.5 * r.ties) / g : NaN;
      },
    )) {
      if (!findings.rollingWin3Best || w.avg > findings.rollingWin3Best.winPct)
        findings.rollingWin3Best = {
          owner: o,
          winPct: +w.avg,
          from: w.from,
          to: w.to,
        };
    }
  }

  for (const o of owners) {
    const seq = rows.filter((r) => r.owner === o);
    if (seq.length >= 3) {
      const s = stddev(seq.map((r) => r.pf));
      if (!findings.mostConsistent || s < findings.mostConsistent.sd)
        findings.mostConsistent = {
          owner: o,
          sd: +s.toFixed(2),
          seasons: seq.length,
        };
      if (!findings.mostVolatile || s > findings.mostVolatile.sd)
        findings.mostVolatile = {
          owner: o,
          sd: +s.toFixed(2),
          seasons: seq.length,
        };
    }
  }

  for (const r of rows) {
    if (!findings.bestDefense || r.pa < findings.bestDefense.pa)
      findings.bestDefense = { owner: r.owner, pa: r.pa, season: r.season };
    if (
      !findings.bestRecordSeason ||
      r.wins > findings.bestRecordSeason.wins ||
      (r.wins === findings.bestRecordSeason.wins &&
        r.pf > findings.bestRecordSeason.pf)
    ) {
      findings.bestRecordSeason = {
        owner: r.owner,
        wins: r.wins,
        pf: r.pf,
        season: r.season,
      };
    }
  }

  for (const r of rows) {
    const d = Number.isFinite(r.diff) ? r.diff : r.pf - r.pa;
    if (!findings.bestDiffSeason || d > findings.bestDiffSeason.diff)
      findings.bestDiffSeason = {
        owner: r.owner,
        diff: +d.toFixed(2),
        season: r.season,
      };
    if (!findings.worstDiffSeason || d < findings.worstDiffSeason.diff)
      findings.worstDiffSeason = {
        owner: r.owner,
        diff: +d.toFixed(2),
        season: r.season,
      };
  }

  const midMap = new Map<string, number>();
  for (const r of rows)
    if (r.rank >= 5 && r.rank <= 10)
      midMap.set(r.owner, (midMap.get(r.owner) ?? 0) + 1);
  for (const [o, c] of midMap)
    if (c >= 3 && (!findings.mostMiddling || c > findings.mostMiddling.count))
      findings.mostMiddling = { owner: o, count: c };

  const bySeason = new Map<number, Row[]>();
  for (const r of rows)
    bySeason.set(r.season, [...(bySeason.get(r.season) || []), r]);
  for (const [yr, list] of bySeason) {
    const worst = list.slice().sort((a, b) => b.rank - a.rank)[0];
    if (!worst || !Number.isFinite(worst.moves as number)) continue;
    if (
      !findings.mostMovesLowestRank ||
      (worst.moves as number) > findings.mostMovesLowestRank.moves
    )
      findings.mostMovesLowestRank = {
        owner: worst.owner,
        moves: worst.moves,
        season: yr,
        rank: worst.rank,
      };
  }

  const playoffs = rows.filter(
    (r) => r.playoffTeams && r.rank >= 1 && r.rank <= r.playoffTeams,
  );
  if (playoffs.length) {
    const over = playoffs
      .slice()
      .sort((a, b) => a.pf - b.pf || a.rank - b.rank)[0];
    const under = playoffs
      .slice()
      .sort((a, b) => b.pf - a.pf || b.rank - a.rank)[0];
    if (over)
      findings.overachiever = {
        owner: over.owner,
        rank: over.rank,
        pf: over.pf,
        season: over.season,
      };
    if (under)
      findings.underachiever = {
        owner: under.owner,
        rank: under.rank,
        pf: under.pf,
        season: under.season,
      };
  }

  const out: any = {
    leagueId,
    source: "espn",
    notes,
    counts: {
      rowsRead: raw.length,
      rowsNormalized: rows.length,
      seasons: seasons.length,
    },
    champions: seasons
      .filter((s) => s.champion)
      .map((s) => ({ season: s.season, ...s.champion! })),
    seasons,
    leaders: { owners: leaders },
    findings,
  };

  return out;
}
