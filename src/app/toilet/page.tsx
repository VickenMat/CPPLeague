import { fetchSeasonSchedule } from "../../../lib/espnHistoric";
import { currentSeason } from "../../../lib/league";
export const dynamic = "force-dynamic";
export default async function ConsolationPage() {
  const season = currentSeason();
  const data = await fetchSeasonSchedule("A", season);
  const games = data.schedule.filter((game) => game.phase === "consolation");
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-center text-4xl font-bold">Consolation Matchups</h1>
      <p className="mt-4 text-center text-gray-400">
        {season} · Results from ESPN
      </p>
      {!games.length ? (
        <p className="mt-8 text-center text-gray-400">
          No consolation matchups are scheduled yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {games.map((game, index) => (
            <li key={index} className="rounded-xl border border-gray-800 p-4">
              Matchup {game.week}: {game.homeName} vs {game.awayName}
              <span className="ml-3 text-gray-400">
                {game.completed
                  ? `${game.homePoints.toFixed(2)} – ${game.awayPoints.toFixed(2)}`
                  : "Pending"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
