"use client";

import Link from "next/link";
import { PageShell } from "../components/LeagueUI";
import { useEffect, useMemo, useState } from "react";
import TransactionHistory from "./TransactionHistory";
import { formatEstTime } from "../../lib/display-time";

type Player = {
  id: number;
  name: string;
  position: string;
  nflTeam: string;
  status: string;
  waiverProcessDate: number | null;
  injuryStatus: string;
  percentOwned: number | null;
  value: number | null;
  weeklyProjection: number | null;
  seasonTotal: number | null;
  pointsPerGame: number | null;
  byeWeek: number | null;
};
type Pool = {
  currentWeek: number | null;
  players: Player[];
  season: string;
  updatedAt: string;
  warning?: string;
};
type SortColumn =
  "value" | "owned" | "weeklyProjection" | "seasonTotal" | "pointsPerGame";
const SORT_LABELS: Record<SortColumn, string> = {
  value: "Value",
  owned: "Rostered %",
  weeklyProjection: "Weekly projection",
  seasonTotal: "Season total",
  pointsPerGame: "P/G",
};
const formatPoints = (value: number | null) =>
  value == null ? "—" : value.toFixed(1);
const PLAYERS_PER_PAGE = 100;
const POSITION_COLORS: Record<string, string> = {
  QB: "text-red-400",
  RB: "text-green-400",
  WR: "text-blue-400",
  TE: "text-orange-400",
  "D/ST": "text-purple-400",
  K: "text-yellow-300",
};

function injuryLabel(status: string) {
  return ["IR", "INJURYRESERVE", "INJUREDRESERVE"].includes(
    status.toUpperCase().replace(/[^A-Z]/g, ""),
  )
    ? "IR"
    : status.replaceAll("_", " ");
}

export default function WaiversPage() {
  const [transactionView, setTransactionView] = useState<
    "history" | "insights" | null
  >(null);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortColumn>("owned");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [refresh, setRefresh] = useState(0);
  const [pool, setPool] = useState<Pool | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPool(null);
    setError("");
    setPage(1);
    async function load() {
      try {
        const res = await fetch("/api/espn/available-players", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Unable to load available players.");
        if (!controller.signal.aborted) setPool(data);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Unable to load players.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => setPage(1), [search, position, status, sort, direction]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (pool?.players || [])
      .filter(
        (p) =>
          (!needle ||
            `${p.name} ${p.nflTeam}`.toLowerCase().includes(needle)) &&
          (!position || p.position === position) &&
          (!status || p.status === status),
      )
      .sort((a, b) => {
        const key = sort === "owned" ? "percentOwned" : sort;
        const left = a[key] ?? null;
        const right = b[key] ?? null;
        // Keep missing values at the bottom in either direction.
        if (left === null && right !== null) return 1;
        if (right === null && left !== null) return -1;
        return (
          ((left ?? 0) - (right ?? 0)) * (direction === "asc" ? 1 : -1) ||
          a.name.localeCompare(b.name)
        );
      });
  }, [pool, search, position, status, sort, direction]);
  function toggleSort(column: SortColumn) {
    setDirection(sort === column && direction === "desc" ? "asc" : "desc");
    setSort(column);
  }

  function clearFilters() {
    setSearch("");
    setPosition("");
    setStatus("");
    setPage(1);
  }

  const pages = Math.max(1, Math.ceil(filtered.length / PLAYERS_PER_PAGE));
  const currentPage = Math.min(page, pages);
  const control =
    "rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white";

  return (
    <PageShell
      title="Waivers & Free Agents"
      subtitle="Available players, transactions, and league insights."
    >
      <Link href="/trade" className="text-sm text-gray-400 hover:text-white">
        ← Trade Calculator
      </Link>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          aria-pressed={transactionView === "history"}
          aria-expanded={transactionView === "history"}
          aria-controls="transaction-history"
          onClick={() =>
            setTransactionView((view) =>
              view === "history" ? null : "history",
            )
          }
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${transactionView === "history" ? "border-red-600 bg-red-600 text-white hover:bg-red-700" : "border-gray-700 bg-gray-950 text-gray-200 hover:border-gray-500 hover:bg-gray-900"}`}
        >
          Transaction History
        </button>
        <button
          aria-pressed={transactionView === "insights"}
          aria-expanded={transactionView === "insights"}
          aria-controls="transaction-insights"
          onClick={() =>
            setTransactionView((view) =>
              view === "insights" ? null : "insights",
            )
          }
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${transactionView === "insights" ? "border-red-600 bg-red-600 text-white hover:bg-red-700" : "border-gray-700 bg-gray-950 text-gray-200 hover:border-gray-500 hover:bg-gray-900"}`}
        >
          Insights
        </button>
      </div>
      {transactionView && (
        <TransactionHistory refresh={refresh} view={transactionView} />
      )}
      <div className="my-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <label className="col-span-2 flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="sr-only">Search</span>
          <input
            className={control}
            placeholder="Player or NFL team"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span className="sr-only">Position</span>
          <select
            className={control}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            <option value="">All positions</option>
            {["QB", "RB", "WR", "TE", "K", "D/ST", "Other"].map((pos) => (
              <option key={pos}>{pos}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span className="sr-only">Availability</span>
          <select
            className={control}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All available</option>
            <option value="WAIVERS">Waivers</option>
            <option value="FREEAGENT">Free agents</option>
          </select>
        </label>
        <button
          className={
            control +
            " self-end transition-colors hover:border-sky-500 hover:bg-sky-900/50"
          }
          onClick={clearFilters}
        >
          Clear Filters
        </button>
        <button
          className={
            control +
            " self-end transition-colors enabled:hover:border-sky-500 enabled:hover:bg-sky-900/50 disabled:opacity-50"
          }
          disabled={loading}
          onClick={() => setRefresh((n) => n + 1)}
        >
          Refresh
        </button>
      </div>
      {loading && <p role="status">Loading available players from ESPN…</p>}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-800 bg-red-950/30 p-4"
        >
          {error}
        </p>
      )}
      {pool && !loading && (
        <>
          <p className="mb-3 text-center text-sm text-gray-400">
            {filtered.length.toLocaleString()} of{" "}
            {pool.players.length.toLocaleString()} available players ·{" "}
            {pool.season} season
            {pool.currentWeek ? ` · Week ${pool.currentWeek}` : ""} · Updated{" "}
            {formatEstTime(pool.updatedAt)} EST
          </p>
          {pool.warning && (
            <p role="alert" className="mb-3 text-amber-300">
              {pool.warning}
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-gray-400">
                <tr>
                  {["Player", "Availability"].map((title) => (
                    <th
                      scope="col"
                      key={title}
                      className="whitespace-nowrap px-4 py-3"
                    >
                      {title}
                    </th>
                  ))}
                  {(
                    [
                      "value",
                      "owned",
                      "weeklyProjection",
                      "seasonTotal",
                      "pointsPerGame",
                    ] as const
                  ).map((column) => (
                    <th
                      scope="col"
                      key={column}
                      className="whitespace-nowrap px-4 py-3"
                      aria-sort={
                        sort === column
                          ? direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      <button
                        onClick={() => toggleSort(column)}
                        className="inline-flex items-center gap-1.5 hover:text-white"
                        aria-label={`Sort by ${SORT_LABELS[column].toLowerCase()} ${sort === column && direction === "desc" ? "ascending" : "descending"}`}
                      >
                        {column === "weeklyProjection"
                          ? `Wk ${pool.currentWeek ?? "—"} Proj.`
                          : SORT_LABELS[column]}
                        <span
                          aria-hidden="true"
                          className={`text-xs ${sort === column ? "text-white" : "text-gray-600"}`}
                        >
                          {sort === column && direction === "asc" ? "↑" : "↓"}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3"
                    title="Bye week: green = passed, red = current week"
                  >
                    BYE
                  </th>
                  {["Position", "Team"].map((title) => (
                    <th
                      scope="col"
                      key={title}
                      className="whitespace-nowrap px-4 py-3"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice(
                    (currentPage - 1) * PLAYERS_PER_PAGE,
                    currentPage * PLAYERS_PER_PAGE,
                  )
                  .map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-gray-800 hover:bg-white/5"
                    >
                      <td className="px-4 py-3 font-medium">
                        {p.name}
                        {p.injuryStatus && p.injuryStatus !== "ACTIVE" && (
                          <span className="ml-2 text-xs text-amber-300">
                            {injuryLabel(p.injuryStatus)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            p.status === "WAIVERS"
                              ? "text-amber-300"
                              : "text-emerald-300"
                          }
                        >
                          {p.status === "WAIVERS" ? "Waivers" : "Free agent"}
                        </span>
                        {p.waiverProcessDate &&
                        p.waiverProcessDate > Date.now() ? (
                          <div
                            title="Eastern Standard Time (UTC−5)"
                            className="mt-1 whitespace-nowrap text-xs text-gray-400"
                          >
                            Processes {formatEstTime(p.waiverProcessDate)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {p.value === null ? (
                          <span className="text-gray-500">No value</span>
                        ) : (
                          p.value.toLocaleString()
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {p.percentOwned === null
                          ? "—"
                          : `${p.percentOwned.toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatPoints(p.weeklyProjection)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatPoints(p.seasonTotal)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatPoints(p.pointsPerGame)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <span
                          className={
                            p.byeWeek != null && pool.currentWeek != null
                              ? p.byeWeek === pool.currentWeek
                                ? "text-red-400"
                                : p.byeWeek < pool.currentWeek
                                  ? "text-green-400"
                                  : ""
                              : ""
                          }
                          aria-label={
                            p.byeWeek == null
                              ? "Bye week unavailable"
                              : `Bye week ${p.byeWeek}${pool.currentWeek == null ? "" : p.byeWeek === pool.currentWeek ? ", current week" : p.byeWeek < pool.currentWeek ? ", already passed" : ", upcoming"}`
                          }
                        >
                          {p.byeWeek ?? "—"}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${POSITION_COLORS[p.position] || "text-gray-300"}`}
                      >
                        {p.position}
                      </td>
                      <td className="px-4 py-3">{p.nflTeam || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!filtered.length && (
              <p className="p-6 text-gray-400">
                No available players match these filters.
              </p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              className={control + " disabled:opacity-40"}
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">
              Page {currentPage} of {pages}
            </span>
            <button
              className={control + " disabled:opacity-40"}
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Rostered % is ESPN-wide ownership. Availability can change; confirm
            on ESPN before making a claim. Values use the 2026 FantasyCalc
            rankings.
          </p>
        </>
      )}
    </PageShell>
  );
}
