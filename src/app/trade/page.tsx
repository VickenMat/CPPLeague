"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PlayerSearch, { type RankedPlayer } from "./PlayerSearch";

/** ---------------- Types ---------------- */
type PlayerRow = {
  id: number;
  name: string;
  position: string;
  nflTeam?: string;
};

type TeamSummary = {
  id: string | number;
  name: string;
  abbrev?: string;
  record?: string;
  rank?: number;
  pf?: number;
  pa?: number;
};

type RosterResponse = { team: TeamSummary; players: PlayerRow[] };

type TradeItem = {
  id: string;
  side: 0 | 1;
  type: "player";
  name: string;
  position: string;
  nflTeam?: string;
  value: number;
  playerId: number;
  inTrade: boolean;
};

/** -------------- Constants -------------- */
const POS_ORDER = ["QB", "RB", "WR", "TE", "DST", "K", "Other"] as const;

const POS_INDEX: Record<string, number> = POS_ORDER.reduce(
  (acc, pos, i) => ({ ...acc, [pos]: i }),
  {} as Record<string, number>,
);

const EGGSHELL = "#F0EAD6";

/** --------------- Helpers --------------- */
const uid = () => Math.random().toString(36).slice(2, 10);

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

async function fetchLeagueSummary() {
  const res = await fetch("/api/espn/summary", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch /api/espn/summary");
  return res.json();
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const j = text ? JSON.parse(text) : null;
    return (
      (j?.error || j?.message || "").toString() ||
      res.statusText ||
      "Unknown error"
    );
  } catch {
    return text || res.statusText || "Unknown error";
  }
}

function friendlyHttpError(action: string, status: number, msg?: string) {
  const suffix = msg ? ` — ${msg}` : "";
  if (status === 400)
    return `${action}: bad request (missing/invalid params)${suffix}`;
  if (status === 401 || status === 403)
    return `${action}: unauthorized with ESPN (cookies/auth) [${status}]${suffix}`;
  if (status === 404)
    return `${action}: not found (team or league) [404]${suffix}`;
  if (status === 429) return `${action}: rate limited by ESPN [429]${suffix}`;
  if (status >= 500) return `${action}: server error [${status}]${suffix}`;
  return `${action}: HTTP ${status}${suffix}`;
}

/* ------------------------ UI style helpers ------------------------ */
const selectorDecor = () =>
  "rounded-2xl border border-gray-800 bg-black/20 shadow-lg";

function posBadgeClass(pos: string) {
  const base =
    "text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 border";
  switch (pos) {
    case "QB":
      return `${base} border-red-700 bg-red-900/40 text-red-200`;
    case "RB":
      return `${base} border-green-700 bg-green-900/40 text-green-200`;
    case "WR":
      return `${base} border-blue-700 bg-blue-900/40 text-blue-200`;
    case "TE":
      return `${base} border-orange-700 bg-orange-900/40 text-orange-200`;
    case "DST":
      return `${base} border-purple-700 bg-purple-900/40 text-purple-200`;
    case "K":
      return `${base} border-yellow-600 bg-yellow-900/40 text-yellow-100`;
    default:
      return `${base} border-gray-600 bg-gray-800 text-gray-200`;
  }
}

function posTextColorClass(pos: string) {
  switch (pos) {
    case "QB":
      return "text-red-400";
    case "RB":
      return "text-green-400";
    case "WR":
      return "text-blue-400";
    case "TE":
      return "text-orange-400";
    case "DST":
      return "text-purple-400";
    case "K":
      return "text-yellow-300";
    default:
      return "text-gray-300";
  }
}

/** Compute advantage based on what each side is RECEIVING */
function computeAdvantage(
  incomingA: number,
  incomingB: number,
): {
  favoredSide: 0 | 1 | null;
  percent: number;
  diff: number;
} {
  const total = incomingA + incomingB;
  if (!total || incomingA === incomingB) {
    return { favoredSide: null, percent: 0, diff: 0 };
  }
  const losing = Math.min(incomingA, incomingB);
  const pct = 100 - (losing / total) * 100;
  const favoredSide = incomingA > incomingB ? 0 : 1;
  const diff = Math.abs(incomingA - incomingB);
  return {
    favoredSide,
    percent: Number(pct.toFixed(1)),
    diff,
  };
}

/** ============================ PAGE ============================ */
export default function TradePage() {
  const [independent, setIndependent] = useState(false);
  const [rankings, setRankings] = useState<RankedPlayer[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState("");
  const [rankingsRetry, setRankingsRetry] = useState(0);
  const [independentItems, setIndependentItems] = useState<TradeItem[]>([]);
  const [leagueId, setLeagueId] = useState<string>("");

  const [season, setSeason] = useState<string>("");
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);

  const [teamAId, setTeamAId] = useState<string>("");
  const [teamBId, setTeamBId] = useState<string>("");
  const [leagueTeamA, setTeamA] = useState<TeamSummary | null>(null);
  const [leagueTeamB, setTeamB] = useState<TeamSummary | null>(null);

  const [leagueItems, setItems] = useState<TradeItem[]>([]);

  const items = independent ? independentItems : leagueItems;
  const teamA = independent ? null : leagueTeamA;
  const teamB = independent ? null : leagueTeamB;

  useEffect(() => {
    if (!independent) return;
    const controller = new AbortController();
    setRankingsLoading(true);
    setRankingsError("");
    (async () => {
      try {
        const response = await fetch("/api/player-rankings", {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load rankings.");
        if (!controller.signal.aborted) setRankings(data.players);
      } catch (error) {
        if (!controller.signal.aborted)
          setRankingsError(
            error instanceof Error ? error.message : "Unable to load rankings.",
          );
      } finally {
        if (!controller.signal.aborted) setRankingsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [independent, rankingsRetry]);

  function addIndependentPlayer(side: 0 | 1, player: RankedPlayer) {
    setIndependentItems((previous) =>
      previous.some((item) => item.playerId === player.id)
        ? previous
        : [
            ...previous,
            {
              id: uid(),
              side,
              type: "player",
              name: player.name,
              position: player.position,
              nflTeam: player.nflTeam,
              value: player.value,
              playerId: player.id,
              inTrade: true,
            },
          ],
    );
  }

  const [sideLoading, setSideLoading] = useState<{ 0: boolean; 1: boolean }>({
    0: false,
    1: false,
  });
  const [sideError, setSideError] = useState<{
    0: string | null;
    1: string | null;
  }>({
    0: null,
    1: null,
  });
  const [sideEmptyRoster, setSideEmptyRoster] = useState<{
    0: boolean;
    1: boolean;
  }>({
    0: false,
    1: false,
  });

  const [sortMode, setSortMode] = useState<{
    0: "position" | "alpha" | "value";
    1: "position" | "alpha" | "value";
  }>({
    0: "position",
    1: "position",
  });

  const [showReview, setShowReview] = useState(false);

  const loadTokenRef = useRef<{ 0: number; 1: number }>({ 0: 0, 1: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTeams(true);
      setTeamsError(null);
      try {
        const summary = await fetchLeagueSummary();
        if (cancelled) return;

        const list: TeamSummary[] = (summary?.teams ?? []).map((t: any) => ({
          id: t.id,
          name: t.name ?? `Team ${t.id}`,
          abbrev: t.abbrev,
          record: t.record ?? t.recordSummary,
          rank: t.playoffSeed ?? t.rank,
          pf: t.pointsFor,
          pa: t.pointsAgainst,
        }));

        setLeagueId(String(summary.leagueId));
        setTeams(list);
        setSeason(String(summary?.season ?? summary?.status?.seasonId ?? ""));
        setCurrentWeek(
          Number(summary?.currentWeek) ||
            Number(summary?.status?.currentMatchupPeriod) ||
            null,
        );
        if (!list.length)
          setTeamsError("No teams returned from /api/espn/summary.");
      } catch (e: any) {
        if (!cancelled) {
          setTeams([]);
          setTeamsError(
            e?.message || "Failed to load teams from /api/espn/summary",
          );
        }
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Load roster + values for a side (auto on select) */
  async function loadRosterToSide(side: 0 | 1, chosenTeamId: string) {
    const token = Date.now();
    loadTokenRef.current[side] = token;
    setSideLoading((s) => ({ ...s, [side]: true }));
    setSideError((s) => ({ ...s, [side]: null }));
    setSideEmptyRoster((s) => ({ ...s, [side]: false }));
    setItems((prev) => prev.filter((i) => i.side !== side));

    try {
      const lid = leagueId;
      const wk = Number(currentWeek || 1);

      if (!season)
        throw new Error("Season is not initialized yet from /api/espn/summary");

      // ------- roster -------
      const rosterUrl = `/api/espn/roster?${new URLSearchParams({
        leagueId: lid,
        teamId: chosenTeamId,
        season,
      }).toString()}`;
      const rr = await fetch(rosterUrl, { cache: "no-store" });
      if (!rr.ok) {
        const msg = await readError(rr);
        throw new Error(friendlyHttpError("Roster", rr.status, msg));
      }
      const rjson: RosterResponse = await rr.json();

      if (loadTokenRef.current[side] !== token) return;

      if (side === 0) setTeamA(rjson.team);
      else setTeamB(rjson.team);

      const players = rjson.players ?? [];
      if (players.length === 0) {
        setSideEmptyRoster((s) => ({ ...s, [side]: true }));
        return;
      }

      // ------- values from FantasyCalc-backed route -------
      const ids = players.map((p) => String(p.id)).filter(Boolean);

      const pvSearch = new URLSearchParams({
        leagueId: lid,
        season,
        scoringPeriodId: String(wk),
        playerIds: ids.join(","),
      });

      const pvUrl = `/api/espn/player-values?${pvSearch.toString()}`;
      const pvRes = await fetch(pvUrl, { cache: "no-store" });

      let values: Record<string, number> = {};
      if (!pvRes.ok) {
        const msg = await readError(pvRes);
        setSideError((s) => ({
          ...s,
          [side]: friendlyHttpError("Values", pvRes.status, msg),
        }));
      } else {
        const pv = await pvRes.json();
        values = pv.values || {};
      }

      if (loadTokenRef.current[side] !== token) return;

      setItems((prev) => {
        const others = prev.filter((i) => i.side !== side);
        const nextForSide: TradeItem[] = players.map((p) => {
          const rawPos = (p.position || "").toUpperCase();
          const position =
            rawPos === "D/ST" || rawPos === "DST"
              ? "DST"
              : (rawPos as TradeItem["position"]);

          // base value from CSV
          let baseVal = Number(values[String(p.id)] ?? 0);
          if (!baseVal || !Number.isFinite(baseVal)) baseVal = 0;

          // special defaults
          if (position === "K" && baseVal === 0) baseVal = 200;
          if (position === "DST" && baseVal === 0) baseVal = 250;

          return {
            id: uid(),
            side,
            type: "player",
            name: p.name,
            position,
            nflTeam: p.nflTeam,
            value: baseVal,
            playerId: p.id,
            inTrade: false,
          };
        });
        return [...others, ...nextForSide];
      });
    } catch (e: any) {
      setSideError((s) => ({
        ...s,
        [side]: e?.message || "Unknown error",
      }));
    } finally {
      if (loadTokenRef.current[side] === token) {
        setSideLoading((s) => ({ ...s, [side]: false }));
      }
    }
  }

  useEffect(() => {
    if (teamAId) loadRosterToSide(0, teamAId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamAId]);

  useEffect(() => {
    if (teamBId) loadRosterToSide(1, teamBId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamBId]);

  /** ------ Selection helpers ------ */
  function toggleItem(id: string) {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, inTrade: !x.inTrade } : x)),
    );
  }

  function clearAll(side: 0 | 1) {
    setItems((prev) =>
      prev.map((x) => (x.side === side ? { ...x, inTrade: false } : x)),
    );
  }

  /** ------ Computations ------ */
  const selectedAOutgoing = useMemo(
    () => items.filter((i) => i.side === 0 && i.inTrade),
    [items],
  );
  const selectedBOutgoing = useMemo(
    () => items.filter((i) => i.side === 1 && i.inTrade),
    [items],
  );

  // What each side is RECEIVING
  const incomingForA = selectedBOutgoing;
  const incomingForB = selectedAOutgoing;

  const totalIncomingA = useMemo(
    () =>
      incomingForA.reduce(
        (s, i) => s + (Number.isFinite(i.value) ? i.value : 0),
        0,
      ),
    [incomingForA],
  );
  const totalIncomingB = useMemo(
    () =>
      incomingForB.reduce(
        (s, i) => s + (Number.isFinite(i.value) ? i.value : 0),
        0,
      ),
    [incomingForB],
  );

  const {
    favoredSide,
    percent: advantagePct,
    diff: valueDiff,
  } = computeAdvantage(totalIncomingA, totalIncomingB);

  const favoredTeamName =
    favoredSide === 0
      ? teamA?.name || "Team A"
      : favoredSide === 1
        ? teamB?.name || "Team B"
        : null;

  const combinedTotal = totalIncomingA + totalIncomingB;

  const canReview = selectedAOutgoing.length + selectedBOutgoing.length > 0;

  /** ----------------------- UI ----------------------- */
  return (
    <div
      className="min-h-screen relative text-white"
      style={{
        backgroundImage: "url('/league-watermark.svg')",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-16 flex items-start justify-center">
        <div className="w-full">
          <header className="mb-6 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold">
              Trade Calculator
            </h1>
            <p className="text-gray-300 mt-1 text-sm md:text-base">
              The percentage below shows how much the trade favors the team
              based on what each side is receiving — closer to 50% means a more
              even deal, while a higher number is more advantageous
            </p>
          </header>

          {/* League Tabs */}
          <div className="mb-6 flex flex-col items-center">
            <div className="flex flex-wrap rounded-2xl border border-gray-800 overflow-hidden">
              <button
                onClick={() => {
                  if (!independent) setRankingsLoading(true);
                  setIndependent(true);
                  setShowReview(false);
                }}
                aria-pressed={independent}
                className={`px-4 py-2 text-sm font-semibold transition ${independent ? "bg-gray-100 text-black" : "bg-black/30 text-gray-300 hover:bg-black/40"}`}
              >
                League Independent
              </button>
              <button
                onClick={() => {
                  setIndependent(false);
                  setShowReview(false);
                }}
                aria-pressed={!independent}
                className={`px-4 py-2 text-sm font-semibold ${!independent ? "bg-sky-700 text-white" : "text-gray-300"}`}
              >
                League Rosters
              </button>
            </div>
            {!independent && (season || currentWeek) && (
              <div className="mt-2 text-xs text-gray-400">
                {season ? (
                  <>
                    Season <span className="font-mono">{season}</span>
                  </>
                ) : null}
                {season && currentWeek ? " · " : null}
                {currentWeek ? (
                  <>
                    Week <span className="font-mono">{currentWeek}</span>
                  </>
                ) : null}
              </div>
            )}
            {!independent && teamsError ? (
              <div className="text-xs text-red-400 mt-2">{teamsError}</div>
            ) : null}
          </div>

          {independent && (
            <section
              className="mb-6"
              aria-label="League independent player selection"
            >
              <p className="mb-3 text-center text-sm text-gray-400">
                Add the players each team is trading away.
              </p>
              {rankingsLoading && (
                <p
                  role="status"
                  className="mb-3 text-center text-sm text-gray-400"
                >
                  Loading player rankings…
                </p>
              )}
              {rankingsError && (
                <div
                  role="alert"
                  className="mb-3 text-center text-sm text-red-400"
                >
                  {rankingsError}{" "}
                  <button
                    className="underline"
                    onClick={() => setRankingsRetry((n) => n + 1)}
                  >
                    Retry
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
                {([0, 1] as const).map((side) => (
                  <PlayerSearch
                    key={side}
                    label={side === 0 ? "Team A" : "Team B"}
                    players={rankings}
                    disabled={rankingsLoading || !!rankingsError}
                    excludedIds={
                      new Set(independentItems.map((item) => item.playerId))
                    }
                    selected={independentItems
                      .filter((item) => item.side === side)
                      .map((item) => ({
                        id: item.playerId,
                        name: item.name,
                        position: item.position,
                        nflTeam: item.nflTeam || "",
                        value: item.value,
                      }))}
                    onAdd={(player) => addIndependentPlayer(side, player)}
                    onClear={() =>
                      setIndependentItems((previous) =>
                        previous.filter((item) => item.side !== side),
                      )
                    }
                    onRemove={(id) =>
                      setIndependentItems((previous) =>
                        previous.filter((item) => item.playerId !== id),
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Trade Score (above trade box) */}
          {(!independent || canReview) && (
            <div className="rounded-2xl border border-gray-800 bg-black/30 p-4 mb-6 text-center">
              {combinedTotal === 0 ? (
                <div className="text-sm text-gray-300">Awaiting players</div>
              ) : (
                <>
                  {/* Big headline: Team X is favored by Y% */}
                  <div className="text-lg md:text-2xl font-semibold mb-1">
                    {favoredTeamName ? (
                      <>
                        {favoredTeamName} is favored by{" "}
                        <span className="font-extrabold text-2xl md:text-3xl text-green-400">
                          {advantagePct.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      "Even trade"
                    )}
                  </div>

                  {/* Bar */}
                  <div className="mt-3 mb-2 h-3 w-full rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${clamp(
                          favoredSide === null
                            ? 50
                            : favoredSide === 0
                              ? (totalIncomingA / combinedTotal) * 100
                              : (totalIncomingB / combinedTotal) * 100,
                          0,
                          100,
                        )}%`,
                        background:
                          "linear-gradient(to right, #16a34a, #4ade80)",
                      }}
                    />
                  </div>

                  {/* Totals line */}
                  <div className="text-xs md:text-sm text-gray-300">
                    <span className="font-mono font-semibold text-white">
                      {totalIncomingA}
                    </span>{" "}
                    vs{" "}
                    <span className="font-mono font-semibold text-white">
                      {totalIncomingB}
                    </span>{" "}
                    · diff{" "}
                    <span className="font-mono font-semibold text-white">
                      {valueDiff}
                    </span>
                  </div>
                </>
              )}

              {/* Receiving summaries – responsive layout already in place; just centering headers */}
              {(incomingForA.length > 0 || incomingForB.length > 0) && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* Side A receives */}
                  <div className="rounded-2xl border border-gray-800 bg-black/40 p-3">
                    <div className="text-center font-semibold mb-1">
                      {teamA?.name || "Team A"}
                    </div>
                    <div className="text-xs text-gray-300 text-center mb-1">
                      Receiving {incomingForA.length}{" "}
                      {incomingForA.length === 1 ? "player" : "players"}{" "}
                      totaling{" "}
                      <span className="font-mono">
                        {totalIncomingA.toFixed(0)}
                      </span>{" "}
                      value
                    </div>
                    {incomingForA.length === 0 ? (
                      <div className="text-xs text-gray-500 text-center">
                        No incoming players.
                      </div>
                    ) : (
                      <ul className="mt-1 space-y-1 text-xs">
                        {incomingForA.map((p) => (
                          <li key={p.id} className="flex justify-center">
                            <span className="truncate text-center">
                              {p.position} · {p.name}{" "}
                              <span className="font-mono">
                                {p.value.toFixed(0)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-2 text-xs text-gray-200 font-semibold text-center">
                      Total value:{" "}
                      <span className="font-mono">
                        {totalIncomingA.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Side B receives */}
                  <div className="rounded-2xl border border-gray-800 bg-black/40 p-3">
                    <div className="text-center font-semibold mb-1">
                      {teamB?.name || "Team B"}
                    </div>
                    <div className="text-xs text-gray-300 text-center mb-1">
                      Receiving {incomingForB.length}{" "}
                      {incomingForB.length === 1 ? "player" : "players"}{" "}
                      totaling{" "}
                      <span className="font-mono">
                        {totalIncomingB.toFixed(0)}
                      </span>{" "}
                      value
                    </div>
                    {incomingForB.length === 0 ? (
                      <div className="text-xs text-gray-500 text-center">
                        No incoming players.
                      </div>
                    ) : (
                      <ul className="mt-1 space-y-1 text-xs">
                        {incomingForB.map((p) => (
                          <li key={p.id} className="flex justify-center">
                            <span className="truncate text-center">
                              {p.position} · {p.name}{" "}
                              <span className="font-mono">
                                {p.value.toFixed(0)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-2 text-xs text-gray-200 font-semibold text-center">
                      Total value:{" "}
                      <span className="font-mono">
                        {totalIncomingB.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Team selection + players */}
          <div
            className={[
              independent ? "" : selectorDecor(),
              "p-4 md:p-5 mb-8",
            ].join(" ")}
          >
            {!independent && (
              <>
                {/* Team dropdowns – side by side from small screens up */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-4">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="text-xs text-gray-400 text-center mb-0.5">
                      <span className="text-[11px]" style={{ color: EGGSHELL }}>
                        TEAM A
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        className="w-full rounded-lg bg-black/40 border px-8 py-2 text-center [text-align-last:center] outline-none focus:ring-2 appearance-none"
                        style={{
                          borderColor: EGGSHELL,
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
                        }}
                        value={teamAId}
                        onChange={(e) => setTeamAId(e.target.value)}
                        disabled={loadingTeams || sideLoading[0]}
                      >
                        <option value="">
                          {loadingTeams ? "Loading teams…" : "Choose a team"}
                        </option>
                        {teams
                          .slice()
                          .sort((a, b) =>
                            (a.name || "").localeCompare(b.name || ""),
                          )
                          .map((t) => (
                            <option
                              key={String(t.id)}
                              value={String(t.id)}
                              disabled={String(t.id) === teamBId}
                            >
                              {t.name}
                            </option>
                          ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 text-xs">
                        ▾
                      </span>
                    </div>
                    {sideError[0] ? (
                      <div className="text-[11px] text-red-400 text-center mt-1">
                        {sideError[0]}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1 w-full">
                    <div className="text-xs text-gray-400 text-center mb-0.5">
                      <span className="text-[11px]" style={{ color: EGGSHELL }}>
                        TEAM B
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        className="w-full rounded-lg bg-black/40 border px-8 py-2 text-center [text-align-last:center] outline-none focus:ring-2 appearance-none"
                        style={{
                          borderColor: EGGSHELL,
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
                        }}
                        value={teamBId}
                        onChange={(e) => setTeamBId(e.target.value)}
                        disabled={loadingTeams || sideLoading[1]}
                      >
                        <option value="">
                          {loadingTeams ? "Loading teams…" : "Choose a team"}
                        </option>
                        {teams
                          .slice()
                          .sort((a, b) =>
                            (a.name || "").localeCompare(b.name || ""),
                          )
                          .map((t) => (
                            <option
                              key={String(t.id)}
                              value={String(t.id)}
                              disabled={String(t.id) === teamAId}
                            >
                              {t.name}
                            </option>
                          ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 text-xs">
                        ▾
                      </span>
                    </div>
                    {sideError[1] ? (
                      <div className="text-[11px] text-red-400 text-center mt-1">
                        {sideError[1]}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Players grid – side by side from small screens up */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  {[0, 1].map((side) => {
                    const team = side === 0 ? teamA : teamB;
                    const list = items.filter((i) => i.side === side);

                    const sortedList = [...list].sort((a, b) => {
                      const mode = sortMode[side as 0 | 1];
                      if (mode === "position") {
                        const pa =
                          POS_INDEX[a.position] ?? POS_INDEX["Other"] ?? 99;
                        const pb =
                          POS_INDEX[b.position] ?? POS_INDEX["Other"] ?? 99;
                        if (pa !== pb) return pa - pb;
                        return a.name.localeCompare(b.name);
                      }
                      if (mode === "value") {
                        return (b.value || 0) - (a.value || 0);
                      }
                      return a.name.localeCompare(b.name);
                    });

                    const selectedByPos: Record<string, number> = {};
                    sortedList
                      .filter((p) => p.inTrade)
                      .forEach((p) => {
                        const key = POS_ORDER.includes(p.position as any)
                          ? p.position
                          : "Other";
                        selectedByPos[key] = (selectedByPos[key] || 0) + 1;
                      });

                    const totalTeamValue = sortedList.reduce(
                      (s, p) => s + (Number.isFinite(p.value) ? p.value : 0),
                      0,
                    );

                    return (
                      <div
                        key={side}
                        className="rounded-2xl border border-gray-800 bg-black/30 p-3 sm:p-4"
                      >
                        {/* Team name */}
                        <div className="text-center mb-1">
                          <div className="text-sm font-semibold truncate">
                            {team?.name
                              ? team.name
                              : side === 0
                                ? "Side A"
                                : "Side B"}
                          </div>
                        </div>

                        {/* Sort + clear on one line, no Selected */}
                        <div className="mt-2 mb-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                          <span>Sort:</span>
                          <button
                            onClick={() =>
                              setSortMode((s) => ({
                                ...s,
                                [side]: "position",
                              }))
                            }
                            className={[
                              "px-2 py-0.5 rounded border text-[11px]",
                              sortMode[side as 0 | 1] === "position"
                                ? "border-sky-500 bg-sky-900/60 text-sky-100"
                                : "border-gray-700 bg-black/40 text-gray-300",
                            ].join(" ")}
                          >
                            Position
                          </button>
                          <button
                            onClick={() =>
                              setSortMode((s) => ({
                                ...s,
                                [side]: "value",
                              }))
                            }
                            className={[
                              "px-2 py-0.5 rounded border text-[11px]",
                              sortMode[side as 0 | 1] === "value"
                                ? "border-sky-500 bg-sky-900/60 text-sky-100"
                                : "border-gray-700 bg-black/40 text-gray-300",
                            ].join(" ")}
                          >
                            Value
                          </button>
                          <button
                            onClick={() =>
                              setSortMode((s) => ({
                                ...s,
                                [side]: "alpha",
                              }))
                            }
                            className={[
                              "px-2 py-0.5 rounded border text-[11px]",
                              sortMode[side as 0 | 1] === "alpha"
                                ? "border-sky-500 bg-sky-900/60 text-sky-100"
                                : "border-gray-700 bg-black/40 text-gray-300",
                            ].join(" ")}
                          >
                            A–Z
                          </button>

                          <button
                            onClick={() => clearAll(side as 0 | 1)}
                            className="ml-auto px-2 py-0.5 rounded border border-gray-700 hover:bg-gray-800 text-[11px]"
                          >
                            Clear
                          </button>
                        </div>

                        {/* Position counts line – colored text, centered, no boxes */}
                        <div className="mb-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px]">
                          {POS_ORDER.filter((p) => p !== "Other").map((pos) => {
                            const count = selectedByPos[pos] || 0;
                            return (
                              <span
                                key={pos}
                                className="flex items-center gap-1 text-gray-300"
                              >
                                <span className={posTextColorClass(pos)}>
                                  {pos}
                                </span>
                                <span className="font-mono">{count}</span>
                              </span>
                            );
                          })}
                        </div>

                        {/* Loading / error / empty */}
                        {sideLoading[side as 0 | 1] ? (
                          <div className="text-gray-400 text-sm mt-2">
                            Loading roster…
                          </div>
                        ) : sideError[side as 0 | 1] ? (
                          <div className="text-red-400 text-xs mt-2">
                            {sideError[side as 0 | 1]}
                          </div>
                        ) : sideEmptyRoster[side as 0 | 1] ? (
                          <div className="text-amber-300 text-sm mt-2">
                            This team has no players yet (pre-draft).
                          </div>
                        ) : sortedList.length === 0 ? (
                          <div className="text-gray-500 text-sm mt-2">
                            No players loaded yet.
                          </div>
                        ) : (
                          <>
                            {/* Player list – no checkbox; highlight row when selected */}
                            <div className="space-y-2">
                              {sortedList.map((i) => {
                                const badge = (
                                  <span className={posBadgeClass(i.position)}>
                                    {i.position}
                                  </span>
                                );

                                const scoreBox = (
                                  <div className="font-mono text-sm w-14 text-center">
                                    {i.value.toFixed(0)}
                                  </div>
                                );

                                const label = (
                                  <div className="flex-1 truncate">
                                    <div className="truncate text-sm lg:text-center">
                                      {i.name}
                                    </div>
                                  </div>
                                );

                                return (
                                  <button
                                    key={i.id}
                                    onClick={() => toggleItem(i.id)}
                                    className={[
                                      "w-full text-left rounded-xl border p-2.5 sm:p-3 transition",
                                      i.inTrade
                                        ? "border-[rgba(240,234,214,0.9)] bg-[rgba(240,234,214,0.08)]"
                                        : "border-gray-800 bg-black/20 hover:bg-black/30",
                                    ].join(" ")}
                                  >
                                    <div className="flex items-center gap-4">
                                      {scoreBox}
                                      {label}
                                      {badge}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mt-3 text-xs text-gray-200 font-semibold text-center">
                              Team total value:{" "}
                              <span className="font-mono">
                                {totalTeamValue.toFixed(0)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Review Trade button */}
            <div className="mt-6 flex justify-center">
              <button
                disabled={!canReview}
                onClick={() => canReview && setShowReview(true)}
                className={[
                  "px-6 py-2 rounded-xl border text-sm font-semibold transition",
                  canReview
                    ? "bg-[rgba(240,234,214,1)] text-black border-transparent hover:bg-[rgba(240,234,214,0.9)]"
                    : "border-gray-700 text-gray-500 cursor-not-allowed bg-black/30",
                ].join(" ")}
              >
                Review Trade
              </button>
            </div>
          </div>

          {/* Review Trade Modal */}
          {showReview && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
              <div className="w-full max-w-xl rounded-2xl border border-gray-800 bg-black/95 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-center flex-1">
                    Trade Review
                  </h2>
                  <button
                    onClick={() => setShowReview(false)}
                    className="text-sm text-gray-400 hover:text-gray-200 ml-4"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-center sm:border-r sm:border-gray-700 sm:pr-4">
                      {teamA?.name || "Team A"} receives
                    </div>
                    {incomingForA.length === 0 ? (
                      <div className="text-gray-500 text-xs">No players.</div>
                    ) : (
                      <ul className="space-y-1">
                        {incomingForA.map((p) => (
                          <li
                            key={p.id}
                            className="flex justify-between gap-2 text-xs"
                          >
                            <span className="truncate text-left">
                              {p.position} · {p.name}
                            </span>
                            <span className="font-mono">
                              {p.value.toFixed(0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 text-xs text-gray-200 font-semibold">
                      Total value:{" "}
                      <span className="font-mono">
                        {totalIncomingA.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-center sm:border-r sm:border-gray-700 sm:pr-4">
                      {teamB?.name || "Team B"} receives
                    </div>
                    {incomingForB.length === 0 ? (
                      <div className="text-gray-500 text-xs">No players.</div>
                    ) : (
                      <ul className="space-y-1">
                        {incomingForB.map((p) => (
                          <li
                            key={p.id}
                            className="flex justify-between gap-2 text-xs"
                          >
                            <span className="truncate text-left">
                              {p.position} · {p.name}
                            </span>
                            <span className="font-mono">
                              {p.value.toFixed(0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 text-xs text-gray-200 font-semibold">
                      Total value:{" "}
                      <span className="font-mono">
                        {totalIncomingB.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-400 text-center">
                  {favoredTeamName ? (
                    <>
                      {favoredTeamName} is favored by{" "}
                      <span className="text-green-400 font-semibold">
                        {advantagePct.toFixed(1)}%
                      </span>{" "}
                      (diff {valueDiff})
                    </>
                  ) : (
                    "Even trade"
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
