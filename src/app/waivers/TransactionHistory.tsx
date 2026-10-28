"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEstTime } from "../../lib/display-time";
import {
  groupTransactionRows,
  transactionInsight,
  type TransactionRow,
  type Transaction,
} from "./transaction-rows";
import TransactionAction from "./TransactionAction";
type History = {
  transactions: Transaction[];
  teams: { id: number; name: string }[];
  season: string;
  warning?: string;
};

export default function TransactionHistory({
  refresh,
  view = "history",
}: {
  refresh: number;
  view?: "history" | "insights";
}) {
  const [teamId, setTeamId] = useState("");
  const [insightData, setInsightData] = useState<History | null>(null);
  const [insightError, setInsightError] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const insights = view === "insights";
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
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
      } catch (error) {
        if (!controller.signal.aborted)
          setInsightError(
            error instanceof Error ? error.message : "Unable to load insights.",
          );
      } finally {
        if (!controller.signal.aborted) setInsightLoading(false);
      }
    })();
    return () => controller.abort();
  }, [teamId, insights, history]);
  useEffect(() => setPage(1), [teamId, view]);
  const rows = useMemo(
    () =>
      groupTransactionRows(
        ((insights ? insightData : history)?.transactions || []).filter(
          (transaction) =>
            !insights ||
            (String(transaction.teamId) === teamId &&
              ["Added", "Waiver add", "Dropped"].includes(transaction.action)),
        ),
      ),
    [history, insightData, insights, teamId],
  );
  const pages = Math.max(1, Math.ceil(rows.length / 100));
  const button =
    "rounded-lg border border-gray-700 px-3 py-1.5 text-sm hover:bg-sky-900/50 disabled:opacity-40";
  return (
    <section
      id={insights ? "transaction-insights" : "transaction-history"}
      aria-label={`${insights ? "insights" : "transaction history"}`}
      className="mt-4 rounded-xl border border-gray-800 p-4"
    >
      <h2 className="mb-3 text-center font-semibold">
        {insights ? "Insights" : "Transaction History"}
        {history ? ` · ${history.season}` : ""}
      </h2>
      {loading && (
        <p role="status" className="text-center text-sm text-gray-400">
          Loading season transactions…
        </p>
      )}
      {error && (
        <p role="alert" className="text-center text-sm text-red-400">
          {error}{" "}
          <button onClick={() => setRetry((n) => n + 1)} className="underline">
            Retry
          </button>
        </p>
      )}
      {history && (
        <>
          {history.warning && (
            <p role="alert" className="mb-2 text-sm text-amber-300">
              {history.warning}
            </p>
          )}
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
          {insights && !teamId ? (
            <p className="py-4 text-center text-sm text-gray-400">
              Choose a team to see its adds and cuts.
            </p>
          ) : (
            <>
              {insights && (
                <p className="mb-3 text-center text-xs text-gray-400">
                  Player fantasy points from games starting after each move
                  through now. Net = added players minus cut players. These are
                  player totals, not starting-lineup points.
                </p>
              )}
              {insights && insightLoading && (
                <p
                  role="status"
                  className="py-4 text-center text-sm text-gray-400"
                >
                  Calculating points since each transaction…
                </p>
              )}
              {insights && insightError && (
                <p
                  role="alert"
                  className="py-4 text-center text-sm text-red-400"
                >
                  {insightError}{" "}
                  <button
                    className="underline"
                    onClick={() => setRetry((n) => n + 1)}
                  >
                    Retry
                  </button>
                </p>
              )}
              {insights && insightData?.warning && (
                <p role="alert" className="mb-2 text-sm text-amber-300">
                  {insightData.warning}
                </p>
              )}
              {(!insights ||
                (!insightLoading && !insightError && insightData)) && (
                <>
                  <div className="max-h-[32rem] overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-gray-950 text-gray-400">
                        <tr>
                          {[
                            "Date (EST)",
                            "Action",
                            "Player · Current team",
                            insights ? "Insight" : "Transaction team",
                          ].map((title) => (
                            <th
                              key={title}
                              scope="col"
                              className="px-3 py-2 text-center"
                            >
                              {title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows
                          .slice((page - 1) * 100, page * 100)
                          .map((transaction) => (
                            <tr
                              key={transaction.id}
                              className="border-t border-gray-800 hover:bg-white/5"
                            >
                              <td className="whitespace-nowrap px-3 py-2">
                                {transaction.date
                                  ? formatEstTime(transaction.date)
                                  : "—"}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2">
                                <TransactionAction
                                  action={transaction.action}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                  {transaction.players.map((player) => (
                                    <span key={player.id}>
                                      {transaction.players.length > 1 && (
                                        <span className="mr-1">
                                          <TransactionAction
                                            action={player.action}
                                          />
                                        </span>
                                      )}
                                      <span className="font-medium">
                                        {player.playerName}
                                      </span>
                                      <span className="ml-2 text-xs text-gray-400">
                                        {player.currentTeam}
                                      </span>
                                      {insights && (
                                        <span className="ml-2 text-xs text-gray-300">
                                          {player.pointsSince == null
                                            ? "—"
                                            : `${player.pointsSince.toFixed(1)} pts · ${player.gamesSince} ${player.gamesSince === 1 ? "game" : "games"}`}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {insights ? (
                                  <Insight row={transaction} />
                                ) : (
                                  transaction.team
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!rows.length && (
                      <p className="py-4 text-center text-sm text-gray-400">
                        {insights
                          ? "No adds or cuts for this team this season."
                          : "No transactions this season."}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-400">
                    <button
                      className={button}
                      disabled={page === 1}
                      onClick={() => setPage((n) => n - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      {rows.length} transactions · {page}/{pages}
                    </span>
                    <button
                      className={button}
                      disabled={page === pages}
                      onClick={() => setPage((n) => n + 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function Insight({ row }: { row: TransactionRow }) {
  const { kind, points } = transactionInsight(row);
  if (points === null) return <span className="text-gray-500">—</span>;
  if (kind === "net")
    return (
      <span
        className={`whitespace-nowrap font-semibold ${points > 0 ? "text-green-400" : points < 0 ? "text-red-400" : "text-gray-300"}`}
      >
        {points > 0 ? "+" : ""}
        {points.toFixed(1)} pts ·{" "}
        {points > 0 ? "Net gain" : points < 0 ? "Net loss" : "Even"}
      </span>
    );
  return (
    <span className="text-sm text-gray-300">
      {points.toFixed(1)} pts since {kind === "add" ? "add" : "cut"}
    </span>
  );
}
