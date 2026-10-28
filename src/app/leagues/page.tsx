import Link from "next/link";
import { getLeagueSummary } from "../../../lib/getLeagueSummary";
import { leagueUrl } from "../../../lib/league";

export const dynamic = "force-dynamic";

export default async function LeaguePage() {
  const league = await getLeagueSummary();
  const previousYear = Math.max(...league.previousSeasons);
  const previous = Number.isFinite(previousYear)
    ? await getLeagueSummary({ season: previousYear }).catch(() => null)
    : null;
  const champion = previous?.teams.find((team) => Number(team.finalRank) === 1);
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 text-center">
      <h1 className="text-4xl font-extrabold">{league.leagueName}</h1>
      <p className="mt-3 text-gray-400">{league.season} season</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Teams", league.teamCount],
          ["Playoff Teams", league.settings.playoffTeamCount ?? "—"],
          [
            "Regular-Season Matchups",
            league.settings.regularSeasonMatchups ?? "—",
          ],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl border border-gray-800 p-5"
          >
            <p className="text-sm text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      {champion && (
        <section className="mt-6 rounded-xl border border-gray-800 p-6">
          <h2 className="text-gray-400">{previousYear} Champion</h2>
          <p className="mt-2 text-2xl font-bold">{champion.name}</p>
          <p className="mt-1 text-gray-300">{champion.displayOwner}</p>
        </section>
      )}
      <p className="mt-6 text-gray-400">
        Available previous seasons:{" "}
        {league.previousSeasons.join(", ") || "None reported by ESPN"}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link href="/standings">Standings →</Link>
        <Link href="/teams">Teams →</Link>
        <Link href="/all-time">All-Time →</Link>
        <a href={leagueUrl()} target="_blank" rel="noopener noreferrer">
          ESPN ↗
        </a>
      </div>
    </div>
  );
}
