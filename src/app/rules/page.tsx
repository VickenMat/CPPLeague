import { getLeagueSummary } from "../../../lib/getLeagueSummary";
import { leagueUrl } from "../../../lib/league";
export const dynamic = "force-dynamic";
export default async function RulesPage() {
  const league = await getLeagueSummary();
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h1 className="text-4xl font-bold">League Rules</h1>
      <p className="mt-5 text-gray-300">
        Official scoring, roster requirements, waivers, and playoff settings are
        maintained on ESPN.
      </p>
      <div className="mt-6 rounded-xl border border-gray-800 p-6">
        <p>{league.teamCount} teams</p>
        <p className="mt-2">
          {league.settings.playoffTeamCount ?? "—"} playoff teams
        </p>
        <p className="mt-2">
          {league.settings.regularSeasonMatchups ?? "—"} regular-season matchups
        </p>
      </div>
      <a
        href={leagueUrl().replace("/league?", "/leaguesetup/settings?")}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-block rounded-xl bg-[#D9D7B6] px-5 py-3 font-semibold text-black"
      >
        View ESPN Settings ↗
      </a>
      <p className="mt-5 text-sm text-gray-400">
        No separate league rulebook has been added.
      </p>
    </div>
  );
}
