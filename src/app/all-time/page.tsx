import { getLeagueSummary } from "../../../lib/getLeagueSummary";
import { getHistoryStatistics } from "../../../lib/history-statistics";
import { getMatchupArchive } from "../../../lib/matchup-archive";
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

type StatCard = {
  key: string;
  label: string;
  expl?: string;
  subject: string;
  detail?: string;
  subjectClassName?: string;
};

const fmt2 = (n: any) =>
  Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "—";
const wl = (w: number, l: number, t: number) => `${w}-${l}${t ? `-${t}` : ""}`;

function sortRows(rows: Leader[], sort: string, dir: "asc" | "desc") {
  const m = dir === "asc" ? 1 : -1;
  const get = (r: Leader) =>
    sort === "pf"
      ? r.pf
      : sort === "pa"
        ? r.pa
        : sort === "wins"
          ? r.wins
          : sort === "wl"
            ? (r.wins + 0.5 * r.ties) / (r.wins + r.losses + r.ties || 1)
            : sort === "seasons"
              ? r.seasons
              : sort === "titles"
                ? r.titles
                : sort === "avgpf"
                  ? r.avgPF
                  : r.pf;
  return [...rows].sort((a, b) =>
    get(a) < get(b) ? -m : get(a) > get(b) ? m : 0,
  );
}

function buildParams(sp: Record<string, unknown> | undefined) {
  const p = new URLSearchParams();
  const keys = ["s", "minSeasons", "sort", "dir", "from", "to"] as const;
  for (const k of keys) {
    const v = sp?.[k];
    if (typeof v === "string" && v.length) p.set(k, v);
  }
  return p;
}

/* ---------- Shared visual system ---------- */
const CREAM = "#D9D7B6";

function sectionAccent() {
  return "relative rounded-2xl border border-gray-800 bg-black/20 ring-1 ring-red-500/40 before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:rounded-t-2xl before:bg-red-600 before:content-['']";
}

export default async function AllTimePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const league = await getLeagueSummary();
  const firstSeason = Math.min(
    Number(league.season),
    ...league.previousSeasons,
  );

  const baseParams = buildParams(resolvedSearchParams);
  const apiParams = new URLSearchParams();
  if (baseParams.get("from")) apiParams.set("from", baseParams.get("from")!);
  if (baseParams.get("to")) apiParams.set("to", baseParams.get("to")!);

  const data = await getHistoryStatistics(apiParams);

  const seasons: any[] = Array.isArray(data?.seasons) ? data.seasons : [];
  const rawLeaders: Leader[] = Array.isArray(data?.leaders?.owners)
    ? data.leaders.owners
    : [];
  const findings = data?.findings ?? {};
  const counts = data?.counts ?? {};

  const q =
    typeof resolvedSearchParams.s === "string"
      ? resolvedSearchParams.s.toLowerCase()
      : "";
  const minSeasons = Number(
    typeof resolvedSearchParams.minSeasons === "string"
      ? resolvedSearchParams.minSeasons
      : "0",
  );
  const sort = (
    typeof resolvedSearchParams.sort === "string"
      ? resolvedSearchParams.sort
      : "pf"
  ) as string;
  const dir = (
    typeof resolvedSearchParams.dir === "string"
      ? resolvedSearchParams.dir
      : "desc"
  ) as "asc" | "desc";

  let leaders = rawLeaders.filter(
    (r) => r.seasons >= minSeasons && (!q || r.owner.toLowerCase().includes(q)),
  );
  leaders = sortRows(leaders, sort, dir);

  const champYearsByOwner = new Map<string, number[]>();
  for (const s of seasons) {
    const o = s?.champion?.owner;
    const yr = Number(s?.season);
    if (o && Number.isFinite(yr)) {
      const arr = champYearsByOwner.get(o) ?? [];
      arr.push(yr);
      champYearsByOwner.set(o, arr);
    }
  }
  let maxTitles = 0;
  const hoarders: { owner: string; titles: number; years: number[] }[] = [];
  for (const [owner, years] of champYearsByOwner.entries()) {
    const t = years.length;
    if (t > 0) {
      maxTitles = Math.max(maxTitles, t);
      hoarders.push({ owner, titles: t, years: years.sort((a, b) => a - b) });
    }
  }
  const topHoarders = hoarders
    .filter((h) => h.titles === maxTitles)
    .sort((a, b) => a.owner.localeCompare(b.owner));

  const mm = findings?.mostMiddling || {};
  const mostMiddlingSeasons = mm.seasons ?? mm.count ?? undefined;
  const mostMiddlingAvgRank = mm.avgRank ?? undefined;

  const seasonCards: StatCard[] = [
    {
      key: "lombardi",
      label: "Lombardi Laser",
      expl: "Best Single-Season PF",
      subject: findings?.bestSeasonPF?.owner ?? "—",
      detail: findings?.bestSeasonPF
        ? `${fmt2(findings.bestSeasonPF.pf)} pts (${findings.bestSeasonPF.season})`
        : "",
    },
    {
      key: "bestRecord",
      label: "Ironman",
      expl: "Best Season Record",
      subject: findings?.bestRecordSeason?.owner ?? "—",
      detail: findings?.bestRecordSeason
        ? `${findings.bestRecordSeason.wins} wins • PF ${fmt2(findings.bestRecordSeason.pf)}`
        : "",
    },
    {
      key: "middling",
      label: "Purgatory",
      expl: "Most years finishing 5–10 (≥3)",
      subject: findings?.mostMiddling?.owner ?? "—",
      detail: mostMiddlingSeasons
        ? `${mostMiddlingSeasons} seasons${mostMiddlingAvgRank ? ` • avg rank ${fmt2(mostMiddlingAvgRank)}` : ""}`
        : "",
    },
    {
      key: "consistent",
      label: "Metronome",
      expl: "Most Consistent PF, σ (≥3)",
      subject: findings?.mostConsistent?.owner ?? "—",
      detail: findings?.mostConsistent
        ? `σ≈${fmt2(findings.mostConsistent.sd)} (n=${findings.mostConsistent.seasons})`
        : "",
    },
    {
      key: "volatile",
      label: "Roller Coaster",
      expl: "Most Volatile PF, σ (≥3)",
      subject: findings?.mostVolatile?.owner ?? "—",
      detail: findings?.mostVolatile
        ? `σ≈${fmt2(findings.mostVolatile.sd)} (n=${findings.mostVolatile.seasons})`
        : "",
    },
    {
      key: "rollPF",
      label: "Consistency is Key",
      expl: "Best 3-yr Rolling PF (≥3)",
      subject: findings?.rollingPF3Best?.owner ?? "—",
      detail: findings?.rollingPF3Best
        ? `${fmt2(findings.rollingPF3Best.avgPF)} (${findings.rollingPF3Best.from}–${findings.rollingPF3Best.to})`
        : "",
    },
    {
      key: "rollPFWorst",
      label: "Three-Year Ice Age",
      expl: "Lowest 3-yr Rolling PF (≥3)",
      subject: findings?.rollingPF3Worst?.owner ?? "—",
      detail: findings?.rollingPF3Worst
        ? `${fmt2(findings.rollingPF3Worst.avgPF)} (${findings.rollingPF3Worst.from}–${findings.rollingPF3Worst.to})`
        : "",
    },
    {
      key: "rollWin",
      label: "Lucky or Good?",
      expl: "Best 3-yr Rolling Win% (≥3)",
      subject: findings?.rollingWin3Best?.owner ?? "—",
      detail: findings?.rollingWin3Best
        ? `${(Number(findings.rollingWin3Best.winPct) * 100).toFixed(2)}% (${findings.rollingWin3Best.from}–${findings.rollingWin3Best.to})`
        : "",
    },
    {
      key: "mostMovesSeason",
      label: "Why Even Draft",
      expl: "Most Single-Season Moves",
      subject: findings?.mostMovesSeason?.owner ?? "—",
      detail: findings?.mostMovesSeason
        ? `${findings.mostMovesSeason.moves} moves (${findings.mostMovesSeason.season})`
        : "",
    },
    {
      key: "mostMovesWorstRank",
      label: "Busy for Nothing",
      expl: "Most Moves with Worst Finish",
      subject: findings?.mostMovesLowestRank?.owner ?? "—",
      detail: findings?.mostMovesLowestRank
        ? `${findings.mostMovesLowestRank.moves} moves • rank ${findings.mostMovesLowestRank.rank} (${findings.mostMovesLowestRank.season})`
        : "",
    },
    {
      key: "yoyUp",
      label: "From Out of Nowhere",
      expl: "Biggest Year/Year PF Jump",
      subject: findings?.biggestYoY?.owner ?? "—",
      detail: findings?.biggestYoY
        ? `+${fmt2(findings.biggestYoY.delta)} (${findings.biggestYoY.from}→${findings.biggestYoY.to})`
        : "",
    },
    {
      key: "worstDiff",
      label: "Paper Tiger",
      expl: "Lowest Single-Season PF–PA Differential",
      subject: findings?.worstDiffSeason?.owner ?? "—",
      detail: findings?.worstDiffSeason
        ? `${fmt2(findings.worstDiffSeason.diff)} (${findings.worstDiffSeason.season})`
        : "",
    },
    {
      key: "noRingPF",
      label: "Too Close to the Sun",
      expl: "Highest PF without a Ring",
      subject: findings?.highestPFNoTitle?.owner ?? "—",
      detail: findings?.highestPFNoTitle
        ? `${fmt2(findings.highestPFNoTitle.pf)} pts (${findings.highestPFNoTitle.season})`
        : "",
    },
    {
      key: "yoyDown",
      label: "Fall From Grace",
      expl: "Biggest Year/Year PF Drop",
      subject: findings?.biggestDrop?.owner ?? "—",
      detail: findings?.biggestDrop
        ? `${fmt2(findings.biggestDrop.delta)} (${findings.biggestDrop.from}→${findings.biggestDrop.to})`
        : "",
    },
    {
      key: "bestDiff",
      label: "Sledgehammer Win",
      expl: "Largest Single-Season PF–PA Diff",
      subject: findings?.bestDiffSeason?.owner ?? "—",
      detail: findings?.bestDiffSeason
        ? `${fmt2(findings.bestDiffSeason.diff)} (${findings.bestDiffSeason.season})`
        : "",
    },
    {
      key: "defense",
      label: "No-Fly Zone",
      expl: "Best Defense (lowest PA)",
      subject: findings?.bestDefense?.owner ?? "—",
      detail: findings?.bestDefense
        ? `${fmt2(findings.bestDefense.pa)} PA (${findings.bestDefense.season})`
        : "",
    },
  ];

  const playoffCards: StatCard[] = [
    {
      key: "mostTitles",
      label: "Ring Hoarders",
      expl: "Most Titles",
      subject: topHoarders.length
        ? topHoarders.map((h) => h.owner).join(", ")
        : "—",
      detail: topHoarders.length
        ? topHoarders
            .map((h) => `${h.owner}: ${h.years.join(", ")}`)
            .join(" • ")
        : "",
    },
    {
      key: "champMostWins",
      label: "King of the Hill",
      expl: "Most Wins by a Champion",
      subject: findings?.champMostWins?.owner ?? "—",
      detail: findings?.champMostWins
        ? `${findings.champMostWins.wins} wins • PF ${fmt2(findings.champMostWins.pf)} • ${findings.champMostWins.season}`
        : "",
    },
    {
      key: "champLeastWins",
      label: "Wins Are Overrated",
      expl: "Fewest Wins by a Champion",
      subject: findings?.champLeastWins?.owner ?? "—",
      detail: findings?.champLeastWins
        ? `${findings.champLeastWins.wins} wins • PF ${fmt2(findings.champLeastWins.pf)} • ${findings.champLeastWins.season}`
        : "",
    },
    {
      key: "champHighPF",
      label: "Got it All",
      expl: "Highest PF as Champion",
      subject: findings?.champHighestPF?.owner ?? "—",
      detail: findings?.champHighestPF
        ? `PF ${fmt2(findings.champHighestPF.pf)} (${findings.champHighestPF.season})`
        : "",
    },
    {
      key: "champLowPF",
      label: "Right Time, Right Place",
      expl: "Lowest PF as Champion",
      subject: findings?.champLowestPF?.owner ?? "—",
      detail: findings?.champLowestPF
        ? `PF ${fmt2(findings.champLowestPF.pf)} (${findings.champLowestPF.season})`
        : "",
    },
    {
      key: "overachiever",
      label: "Cinderella",
      expl: "Best Finish for Team with Lowest PF",
      subject: findings?.overachiever?.owner ?? "—",
      detail: findings?.overachiever
        ? `Rank ${findings.overachiever.rank} • PF ${fmt2(findings.overachiever.pf)} (${findings.overachiever.season})`
        : "",
    },
    {
      key: "underachiever",
      label: "Paper Playoff",
      expl: "Worst Finish with Highest PF",
      subject: findings?.underachiever?.owner ?? "—",
      detail: findings?.underachiever
        ? `Rank ${findings?.underachiever?.rank} • PF ${fmt2(findings?.underachiever?.pf)} (${findings?.underachiever?.season})`
        : "",
    },
    {
      key: "champBestDiff",
      label: "Sledgehammer Crown",
      expl: "Largest PF–PA by a Champion",
      subject: findings?.champBestDiff?.owner ?? "—",
      detail: findings?.champBestDiff
        ? `${fmt2(findings.champBestDiff.diff)} (${findings.champBestDiff.season})`
        : "",
    },
  ];

  const envSeason = Number(process.env.ESPN_SEASON || new Date().getFullYear());
  const fromParam = Number(baseParams.get("from") || firstSeason);
  const toParam = Number(baseParams.get("to") || envSeason);
  const espnArchive = await getMatchupArchive(
    new URLSearchParams({ from: String(fromParam), to: String(toParam) }),
  );
  const espnCounts = espnArchive?.counts || {};

  const blowReg = (espnArchive?.blowouts?.regular || []).slice(0, 3);
  const blowPO = (espnArchive?.blowouts?.playoffs || []).slice(0, 3);
  const closeReg = (espnArchive?.closest?.regular || []).slice(0, 3);
  const closePO = (espnArchive?.closest?.playoffs || []).slice(0, 3);
  const pfReg = (espnArchive?.singlePF?.regular || []).slice(0, 5);
  const pfPO = (espnArchive?.singlePF?.playoffs || []).slice(0, 5);

  return (
    <div className="relative min-h-screen text-white px-6 py-10">
      {/* Title + Tabs (centered) */}
      <div className="max-w-7xl mx-auto text-center mb-6">
        <h1 className="text-5xl font-extrabold mb-4">All-Time</h1>
        <p className="text-gray-400">{league.leagueName}</p>
        {data.notes?.length > 0 && (
          <p role="alert" className="mt-3 text-sm text-amber-300">
            Some history is unavailable: {data.notes.join(" ")}
          </p>
        )}
      </div>

      {/* Champions (centered) */}
      <section className={`max-w-7xl mx-auto mb-6 ${sectionAccent()}`}>
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4 text-white text-center">
            <span role="img" aria-label="trophy" className="mr-2">
              🏆
            </span>
            Champions
          </h2>
          {seasons.length === 0 ? (
            <div className="text-gray-400 text-sm text-center">
              No seasons found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch auto-rows-fr justify-items-center">
              {seasons.map((s: any) => {
                const owner = s?.champion?.owner ?? "—";
                const team = s?.champion?.team ?? "—";
                return (
                  <div
                    key={s.season}
                    className="h-full min-h[160px] w-full sm:max-w-sm rounded-xl border border-gray-800 bg-black/30 p-4 text-center"
                  >
                    <div>
                      <div
                        className="text-base font-semibold"
                        style={{ color: CREAM }}
                      >
                        {s.season}
                      </div>
                      <div className="text-xl font-bold mt-0.5 text-white">
                        {owner}
                      </div>
                      <div className="text-sm text-gray-300">{team}</div>
                      {s.champion ? (
                        <div className="text-sm text-gray-400 mt-1">
                          {wl(
                            s.champion.wins,
                            s.champion.losses,
                            s.champion.ties,
                          )}{" "}
                          • PF {fmt2(s.champion.pf)} / PA {fmt2(s.champion.pa)}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">—</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Statistics */}
      <section
        className={`max-w-7xl mx-auto mb-6 ${sectionAccent()} text-center`}
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Statistics</h2>

          {/* Season (tiles centered) */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-white">Season</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch auto-rows-fr justify-items-center">
              {seasonCards.map((f) => (
                <div
                  key={f.key}
                  className="w-full sm:max-w-xs h-full min-h-[160px] rounded-xl border border-gray-800 bg-black/25 p-4 flex flex-col gap-1 text-center"
                >
                  <div className="text-sm">
                    <div
                      className="font-semibold leading-tight"
                      style={{ color: CREAM }}
                    >
                      {f.label}
                    </div>
                    {f.expl && (
                      <div className="leading-tight" style={{ color: CREAM }}>
                        {f.expl}
                      </div>
                    )}
                  </div>
                  <div
                    className={`${f.subjectClassName ?? "text-xl"} font-bold text-white`}
                  >
                    {f.subject || "—"}
                  </div>
                  <div className="text-sm text-gray-300">{f.detail || " "}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Matchups (tiles centered) */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-white">Matchups</h3>
            {(espnCounts?.gamesWithScores ?? 0) === 0 ? (
              <div className="text-gray-400 text-sm">
                No ESPN historic data in range.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 items-stretch auto-rows-fr justify-items-center">
                <CardBlock
                  title="Curb Stomp"
                  subtitle="Biggest Blowouts in the Regular Season"
                  items={blowReg}
                  type="match"
                />
                <CardBlock
                  title="Send Them Packing"
                  subtitle="Biggest Blowouts in the Playoffs"
                  items={blowPO}
                  type="match"
                />
                <CardBlock
                  title="Tough Luck"
                  subtitle="Closest Regular Season Games"
                  items={closeReg}
                  type="match"
                />
                <CardBlock
                  title="Photo Finish"
                  subtitle="Closest Playoff Games"
                  items={closePO}
                  type="match"
                />
                <CardBlock
                  title="Explosion"
                  subtitle="Highest Single Game PF in Regular Season"
                  items={pfReg}
                  type="pf"
                />
                <CardBlock
                  title="Came to Play"
                  subtitle="Highest Single Game PF in the Playoffs"
                  items={pfPO}
                  type="pf"
                />
              </div>
            )}
            <div className="text-xs text-gray-500 mt-3">
              Range: {Number(baseParams.get("from") || firstSeason)}–
              {Number(baseParams.get("to") || new Date().getFullYear())} • Games
              with scores: {espnCounts?.gamesWithScores ?? "—"}
            </div>
          </div>

          {/* Playoffs (tiles centered) */}
          <div className="mb-2">
            <h3 className="text-lg font-semibold mb-3 text-white">Playoffs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch auto-rows-fr justify-items-center">
              {playoffCards.map((f) => (
                <div
                  key={f.key}
                  className="w/full sm:max-w-xs h-full min-h-[160px] rounded-xl border border-gray-800 bg-black/25 p-4 flex flex-col gap-1 text-center"
                >
                  <div className="text-sm">
                    <div
                      className="font-semibold leading-tight"
                      style={{ color: CREAM }}
                    >
                      {f.label}
                    </div>
                    {f.expl && (
                      <div className="leading-tight" style={{ color: CREAM }}>
                        {f.expl}
                      </div>
                    )}
                  </div>
                  <div
                    className={`${f.subjectClassName ?? "text-xl"} font-bold text-white`}
                  >
                    {f.subject || "—"}
                  </div>
                  <div className="text-sm text-gray-300">{f.detail || " "}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* All-Time Leaders (unchanged table) */}
      <section className={`max-w-7xl mx-auto mb-6 ${sectionAccent()}`}>
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4 text-center text-white">
            All-Time Leaders
          </h2>

          <form
            className="flex flex-col sm:flex-row gap-3 mb-3 justify-center"
            method="get"
          >
            <input
              type="text"
              name="s"
              defaultValue={
                typeof resolvedSearchParams.s === "string"
                  ? resolvedSearchParams.s
                  : ""
              }
              placeholder="Search owner…"
              className="px-3 py-2 rounded bg-gray-800 border border-gray-700 w-full sm:max-w-xs"
            />
            <label className="flex items-center gap-2 text-sm text-gray-300">
              Min seasons
              <input
                type="number"
                min={0}
                name="minSeasons"
                defaultValue={
                  typeof resolvedSearchParams.minSeasons === "string"
                    ? resolvedSearchParams.minSeasons
                    : "0"
                }
                className="px-2 py-1 rounded bg-gray-800 border border-gray-700 w-20"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              Sort
              <select
                name="sort"
                defaultValue={
                  typeof resolvedSearchParams.sort === "string"
                    ? resolvedSearchParams.sort
                    : "pf"
                }
                className="px-2 py-1 rounded bg-gray-800 border border-gray-700"
              >
                <option value="pf">PF</option>
                <option value="pa">PA</option>
                <option value="wins">Wins</option>
                <option value="wl">Win %</option>
                <option value="seasons">Seasons</option>
                <option value="titles">Titles</option>
                <option value="avgpf">Avg PF</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              Dir
              <select
                name="dir"
                defaultValue={
                  typeof resolvedSearchParams.dir === "string"
                    ? resolvedSearchParams.dir
                    : "desc"
                }
                className="px-2 py-1 rounded bg-gray-800 border border-gray-700"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </label>
            <button
              className={[
                "px-4 py-2 rounded text-white",
                "bg-sky-700 hover:bg-sky-600",
              ].join(" ")}
            >
              Apply
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-gray-800">
            <table className="min-w-full text-left">
              <thead className="bg-black/40 text-sm">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">PF</th>
                  <th className="px-3 py-2">PA</th>
                  <th className="px-3 py-2">W-L-T</th>
                  <th className="px-3 py-2">Win %</th>
                  <th className="px-3 py-2">Seasons</th>
                  <th className="px-3 py-2">Titles</th>
                  <th className="px-3 py-2">Avg PF</th>
                </tr>
              </thead>
              <tbody>
                {leaders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-3 text-gray-300 text-center"
                    >
                      No rows
                    </td>
                  </tr>
                ) : (
                  leaders.map((r, i) => (
                    <tr key={r.owner} className={i % 2 ? "bg-black/10" : ""}>
                      <td className="px-3 py-2 tabular-nums">{i + 1}</td>
                      <td className="px-3 py-2">{r.owner}</td>
                      <td className="px-3 py-2 tabular-nums">{fmt2(r.pf)}</td>
                      <td className="px-3 py-2 tabular-nums">{fmt2(r.pa)}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {wl(r.wins, r.losses, r.ties)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {(r.winPct * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 tabular-nums">{r.seasons}</td>
                      <td className="px-3 py-2 tabular-nums">{r.titles}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {fmt2(r.avgPF)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Season-by-Season */}
      <section className={`max-w-7xl mx-auto ${sectionAccent()}`}>
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4 text-center text-white">
            Season by Season
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {seasons.map((s: any) => (
              <div
                key={s.season}
                className="rounded-xl border border-gray-800 bg-black/25 p-4"
              >
                <div
                  className="text-xl font-semibold mb-3 text-center"
                  style={{ color: CREAM }}
                >
                  {s.season}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-[13px]">
                    <thead className="text-gray-400">
                      <tr>
                        <th className="px-2 py-1">#</th>
                        <th className="px-2 py-1">Owner</th>
                        <th className="px-2 py-1">Team</th>
                        <th className="px-2 py-1">W-L-T</th>
                        <th className="px-2 py-1">PF</th>
                        <th className="px-2 py-1">PA</th>
                        <th className="px-2 py-1">DIFF</th>
                        <th className="px-2 py-1">PF/G</th>
                        <th className="px-2 py-1">PA/G</th>
                        <th className="px-2 py-1">MOV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(s.standings ?? []).map((r: any, i: number) => (
                        <tr
                          key={r.owner + i}
                          className={i % 2 ? "bg-black/10" : ""}
                        >
                          <td className="px-2 py-1 tabular-nums">
                            {r.rank ?? i + 1}
                          </td>
                          <td className="px-2 py-1">{r.owner}</td>
                          <td className="px-2 py-1">{r.team}</td>
                          <td className="px-2 py-1 tabular-nums">
                            {wl(r.wins, r.losses, r.ties)}
                          </td>
                          <td className="px-2 py-1 tabular-nums">
                            {fmt2(r.pf)}
                          </td>
                          <td className="px-2 py-1 tabular-nums">
                            {fmt2(r.pa)}
                          </td>
                          <td className="px-2 py-1 tabular-nums">
                            {r.diff != null
                              ? fmt2(r.diff)
                              : Number.isFinite(r.pf) && Number.isFinite(r.pa)
                                ? fmt2(r.pf - r.pa)
                                : "—"}
                          </td>
                          <td className="px-2 py-1 tabular-nums">
                            {r.ppg != null ? fmt2(r.ppg) : "—"}
                          </td>
                          <td className="px-2 py-1 tabular-nums">
                            {r.pag != null ? fmt2(r.pag) : "—"}
                          </td>
                          <td className="px-2 py-1 tabular-nums">
                            {r.moves != null ? r.moves : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="text-xs text-gray-400 mt-6 max-w-7xl mx-auto">
        Source: ESPN • Completed-season records: {counts?.rowsNormalized ?? 0}/
        {counts?.rowsRead ?? 0}.
      </p>
    </div>
  );
}

/* Tiles for Matchups/Single PF — now centered text */
function CardBlock({
  title,
  subtitle,
  items,
  type,
}: {
  title: string;
  subtitle: string;
  items: any[];
  type: "match" | "pf";
}) {
  const CREAM = "#D9D7B6";
  return (
    <div className="w-full sm:max-w-sm rounded-xl border border-gray-800 bg-black/25 p-4 text-center">
      <div className="font-semibold leading-tight" style={{ color: CREAM }}>
        {title}
      </div>
      <div className="leading-tight mb-3" style={{ color: CREAM }}>
        {subtitle}
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-300">—</div>
      ) : type === "match" ? (
        <div className="space-y-3">
          {items.map((g, i) => (
            <div key={i}>
              <div className="text-white font-bold text-lg text-center">
                {i + 1}. {g.homeTeam} {fmt2(g.homePoints)} – {g.awayTeam}{" "}
                {fmt2(g.awayPoints)}
              </div>
              <div className="text-gray-400 text-sm text-center">
                Δ {fmt2(g.margin)} • Week {g.week} • {g.season}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r, i) => (
            <div key={i}>
              <div className="text-white font-bold text-lg text-center">
                {i + 1}. {r.team} {fmt2(r.points)}
              </div>
              <div className="text-gray-400 text-sm text-center">
                vs {r.oppTeam} • Week {r.week} • {r.season}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
