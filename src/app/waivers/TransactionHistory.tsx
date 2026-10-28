"use client";
import { useEffect, useMemo, useState } from "react";
import { formatTransactionTime } from "../../lib/display-time";
import {
  groupTransactionRows,
  transactionInsight,
  type TransactionRow,
  type Transaction,
} from "./transaction-rows";

type History = {
  transactions: Transaction[];
  teams: { id: number; name: string }[];
  season: string;
  leagueName?: string;
  warning?: string;
};
const PAGE_SIZE = 100;
export default function TransactionHistory({
  refresh,
  view = "history",
}: {
  refresh: number;
  view?: "history" | "insights";
}) {
  const [teamId, setTeamId] = useState("");
  const [history, setHistory] = useState<History | null>(null);
  const [insightData, setInsightData] = useState<History | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState("");
  const [insightError, setInsightError] = useState("");
  const [retry, setRetry] = useState(0);
  const [insightRetry, setInsightRetry] = useState(0);
  const [page, setPage] = useState(1);
  const insights = view === "insights";
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setHistory(null);
    setError("");
    setPage(1);
    (async () => {
      try {
        const response = await fetch("/api/espn/transactions", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load transaction history.");
        if (!controller.signal.aborted) setHistory(data);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load transaction history.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [refresh, retry]);
  useEffect(() => {
    setInsightData(null);
    setInsightError("");
    setInsightLoading(false);
    setPage(1);
    if (!insights || !teamId || !history) return;
    const controller = new AbortController();
    setInsightLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams({ teamId, season: history.season });
        const response = await fetch(
          `/api/espn/transaction-insights?${params}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load insights.");
        if (!controller.signal.aborted) setInsightData(data);
      } catch (err) {
        if (!controller.signal.aborted)
          setInsightError(
            err instanceof Error ? err.message : "Unable to load insights.",
          );
      } finally {
        if (!controller.signal.aborted) setInsightLoading(false);
      }
    })();
    return () => controller.abort();
  }, [insights, teamId, history, insightRetry]);
  useEffect(() => setPage(1), [view, teamId]);
  const rows = useMemo(
    () =>
      groupTransactionRows(
        ((insights ? insightData : history)?.transactions || []).filter(
          (move) =>
            !insights ||
            (String(move.teamId) === teamId &&
              ["Added", "Waiver add", "Dropped"].includes(move.action)),
        ),
      ),
    [insights, insightData, history, teamId],
  );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const button =
    "rounded-lg border border-gray-700 px-3 py-2 text-sm transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-30";
  const showTable =
    history &&
    (!insights ||
      Boolean(teamId && insightData && !insightLoading && !insightError));
  return (
    <section
      id={insights ? "transaction-insights" : "transaction-history"}
      aria-label={insights ? "Transaction insights" : "Transaction history"}
      className="mt-4 rounded-2xl border border-gray-800 bg-black/30 p-4"
    >
      {insights ? (
        <h2 className="sr-only">Transaction Insights</h2>
      ) : (
        <h2 className="mb-3 text-center font-semibold">
          {history?.leagueName || "CPP Fantasy Football"} · Transaction History
          {history ? ` · ${history.season}` : ""}
        </h2>
      )}
      {loading && (
        <p role="status" className="py-4 text-center text-sm text-gray-400">
          Loading season transactions…
        </p>
      )}
      {error && (
        <p role="alert" className="py-4 text-center text-sm text-red-400">
          {error}{" "}
          <button className="underline" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </button>
        </p>
      )}
      {history && (
        <>
          {insights && (
            <div className="mb-4 flex justify-center">
              <label className="w-full max-w-md">
                <span className="sr-only">Insights team</span>
                <select
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-center [text-align-last:center]"
                >
                  <option value="">Choose a team</option>
                  {history.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {insights && !teamId && (
            <p className="py-4 text-center text-sm text-gray-400">
              Choose a team to see its adds and cuts.
            </p>
          )}
          {insights && teamId && (
            <p className="mb-3 text-center text-xs text-gray-400">
              Player fantasy points from games starting after each move through
              now. Net = added players minus cut players. These are player
              totals, not starting-lineup points.
            </p>
          )}
          {insightLoading && (
            <p role="status" className="py-4 text-center text-sm text-gray-400">
              Calculating actual points since each transaction…
            </p>
          )}
          {insightError && (
            <p role="alert" className="py-4 text-center text-sm text-red-400">
              {insightError}{" "}
              <button
                className="underline"
                onClick={() => setInsightRetry((n) => n + 1)}
              >
                Retry
              </button>
            </p>
          )}
          {(insights ? insightData : history)?.warning && (
            <p role="alert" className="mb-3 text-center text-sm text-amber-300">
              {(insights ? insightData : history)?.warning}
            </p>
          )}
        </>
      )}
      {showTable && (
        <>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[720px] table-fixed text-center text-sm">
              <caption className="sr-only">
                {insights
                  ? "Points gained or lost after adds and cuts"
                  : "Season add and cut activity"}
              </caption>
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[30%]" />
                <col className="w-[30%]" />
                <col className="w-[22%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-gray-950 text-gray-400">
                <tr>
                  <th scope="col" className="px-3 py-3">
                    Date (EST)
                  </th>
                  <th scope="col" className="px-3 py-3 text-green-400">
                    Add
                  </th>
                  <th scope="col" className="px-3 py-3 text-[#F87171]">
                    Cut
                  </th>
                  <th scope="col" className="px-3 py-3">
                    {insights ? "Net points" : "Transaction team"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                  .map((row) => {
                    const adds = row.players.filter((player) =>
                      ["Added", "Waiver add"].includes(player.action),
                    );
                    const cuts = row.players.filter(
                      (player) => player.action === "Dropped",
                    );
                    const other = row.players.filter(
                      (player) =>
                        !adds.includes(player) && !cuts.includes(player),
                    );
                    return (
                      <tr
                        key={row.id}
                        className="border-t border-gray-800 hover:bg-white/5"
                      >
                        <td className="whitespace-nowrap px-3 py-3 align-top">
                          {row.date ? formatTransactionTime(row.date) : "—"}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <PlayerList
                            players={[...adds, ...other]}
                            insights={insights}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <PlayerList players={cuts} insights={insights} />
                        </td>
                        <td className="px-3 py-3 align-top">
                          {insights ? <NetPoints row={row} /> : row.team}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {!rows.length && (
              <p className="py-5 text-center text-sm text-gray-400">
                {insights
                  ? "No adds or cuts for this team this season."
                  : "No transactions this season."}
              </p>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-gray-400">
            <button
              className={button}
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Previous
            </button>
            <span>
              {rows.length} transactions · {currentPage}/{pages}
            </span>
            <button
              className={button}
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
function PlayerList({
  players,
  insights,
}: {
  players: Transaction[];
  insights: boolean;
}) {
  if (!players.length) return <span className="text-gray-500">—</span>;
  return (
    <div className="space-y-2">
      {players.map((player) => (
        <div key={player.id}>
          <div>
            <span className="font-semibold">{player.playerName}</span>
            <span
              className={`ml-2 text-xs ${player.currentTeam === "Waivers" ? "text-yellow-300" : "text-gray-400"}`}
            >
              {player.currentTeam}
            </span>
            {player.action === "Traded" && (
              <span className="ml-2 text-xs text-sky-300">Trade</span>
            )}
          </div>
          {insights && (
            <div className="mt-1 text-xs text-gray-300">
              {player.pointsSince == null
                ? "Points unavailable"
                : `${player.pointsSince.toFixed(1)} pts · ${player.gamesSince ?? "—"} ${player.gamesSince === 1 ? "game" : "games"}`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
function NetPoints({ row }: { row: TransactionRow }) {
  const { points } = transactionInsight(row);
  if (points === null) return <span className="text-gray-500">—</span>;
  return (
    <div
      className={
        points > 0
          ? "text-green-400"
          : points < 0
            ? "text-red-400"
            : "text-gray-300"
      }
    >
      <div className="font-bold tabular-nums">
        {points > 0 ? "+" : ""}
        {points.toFixed(1)}
      </div>
      <div className="mt-1 text-xs">
        {points > 0 ? "Net gain" : points < 0 ? "Net loss" : "Even"}
      </div>
    </div>
  );
}
