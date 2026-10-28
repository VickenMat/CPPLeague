import Link from "next/link";
import { getLeagueSummary } from "../../../lib/getLeagueSummary";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const league = await getLeagueSummary();
  const playoffTeams = league.settings.playoffTeamCount;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center text-4xl font-extrabold">Standings</h1>
      <p className="mt-3 text-center text-gray-400">
        {league.leagueName} · {league.season}
      </p>
      <div className="mt-8 overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              {["Rank", "Team", "Manager", "W", "L", "T", "PF", "PA"].map(
                (title) => (
                  <th key={title} scope="col" className="px-4 py-3">
                    {title}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {league.standings.map((row) => {
              const team = league.teams.find(
                (team) => String(team.id) === String(row.teamId),
              );
              return (
                <tr
                  key={row.teamId}
                  className={`border-t border-gray-800 hover:bg-white/5 ${playoffTeams && row.rank === playoffTeams ? "border-b-2 border-b-amber-400" : ""}`}
                >
                  <td className="px-4 py-3">{row.rank}</td>
                  <td className="px-4 py-3 font-semibold">
                    <Link href={`/teams/${row.teamId}`}>{row.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {team?.displayOwner}
                  </td>
                  {[
                    row.wins,
                    row.losses,
                    row.ties,
                    row.pointsFor.toFixed(2),
                    row.pointsAgainst.toFixed(2),
                  ].map((value, index) => (
                    <td key={index} className="px-4 py-3 tabular-nums">
                      {value}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {playoffTeams != null && (
        <p className="mt-4 text-center text-sm text-gray-400">
          The line marks the top {playoffTeams} seeds. Qualification and
          tiebreakers follow ESPN’s league settings.
        </p>
      )}
    </div>
  );
}
