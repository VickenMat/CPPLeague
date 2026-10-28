import Link from "next/link";
import { getLeagueSummary } from "../../../lib/getLeagueSummary";
import { AccentPanel, PageShell } from "../components/LeagueUI";
export const dynamic = "force-dynamic";
export default async function StandingsPage() {
  const league = await getLeagueSummary();
  const playoffTeams = league.settings.playoffTeamCount;
  const values = league.standings.map((row) => row.pointsFor);
  const maxPF = Math.max(...values),
    minPF = Math.min(...values);
  const differentiated = values.length > 1 && maxPF > minPF;
  return (
    <PageShell
      title="Standings"
      subtitle={`${league.leagueName} · ${league.season}`}
    >
      <div className="mb-5 flex flex-wrap justify-center gap-5 text-sm text-gray-300">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          Playoff Seeds
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-yellow-300" />
          Highest PF
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-orange-400" />
          Lowest PF
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-yellow-300" />
          Playoff Boundary
        </span>
      </div>
      <AccentPanel>
        <h2 className="mb-5 text-center text-2xl font-bold text-red-400">
          {league.leagueName}
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-800">
          <table className="min-w-full text-sm sm:text-base">
            <caption className="sr-only">
              {league.season} standings ordered by ESPN seed
            </caption>
            <thead className="bg-black/40">
              <tr>
                {["Rank", "Team", "W", "L", "T", "PF", "PA"].map((title) => (
                  <th
                    key={title}
                    scope="col"
                    className={`px-4 py-2 ${title === "Team" ? "text-left" : "text-center"}`}
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {league.standings.map((row, index) => {
                const team = league.teams.find(
                  (team) => String(team.id) === String(row.teamId),
                );
                const high = differentiated && row.pointsFor === maxPF,
                  low = differentiated && row.pointsFor === minPF;
                const rowBackground = index % 2 ? "bg-black/10" : "";
                return (
                  <tr
                    key={row.teamId}
                    className={`${rowBackground} ${playoffTeams && row.rank === playoffTeams ? "border-b-[3px] border-yellow-400" : "border-b border-gray-800"}`}
                  >
                    <td className="px-4 py-3 text-center tabular-nums">
                      {row.rank}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/teams/${row.teamId}`}
                        className={`font-semibold hover:underline ${playoffTeams && row.rank <= playoffTeams ? "text-emerald-400" : "text-gray-100"}`}
                      >
                        {row.name}
                      </Link>
                      <div className="mt-0.5 text-xs text-gray-400">
                        {team?.displayOwner}
                      </div>
                    </td>
                    {[row.wins, row.losses, row.ties].map((value, i) => (
                      <td
                        key={i}
                        className="px-4 py-3 text-center tabular-nums"
                      >
                        {value}
                      </td>
                    ))}
                    <td
                      className={`px-4 py-3 text-center tabular-nums ${high ? "font-semibold text-yellow-300" : low ? "font-semibold text-orange-400" : ""}`}
                    >
                      {row.pointsFor.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">
                      {row.pointsAgainst.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AccentPanel>
      <p className="mt-5 text-center text-sm text-gray-400">
        Standings and seeding follow ESPN’s league settings.
        {playoffTeams != null
          ? ` The line marks the top ${playoffTeams} seeds.`
          : ""}
      </p>
    </PageShell>
  );
}
