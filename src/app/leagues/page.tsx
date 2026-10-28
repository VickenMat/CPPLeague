import Link from "next/link";
import { getLeagueSummary } from "../../../lib/getLeagueSummary";
import { getLeagueHistory } from "../../../lib/league-history";
import { leagueUrl } from "../../../lib/league";
import {
  AccentPanel,
  CREAM_BUTTON,
  Fact,
  PageShell,
} from "../components/LeagueUI";
export const dynamic = "force-dynamic";
export default async function LeaguePage() {
  const league = await getLeagueSummary();
  const history = await getLeagueHistory().catch(() => null);
  const champions = (history?.raw || [])
    .filter((row) => Number(row.Rank) === 1)
    .sort((a, b) => Number(b.Season) - Number(a.Season));
  const champion = champions[0];
  const titles = new Map<string, number>();
  for (const row of champions)
    titles.set(String(row.Owner), (titles.get(String(row.Owner)) || 0) + 1);
  const titleLeader = [...titles].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )[0];
  return (
    <PageShell title="League" subtitle={league.leagueName}>
      <AccentPanel className="mx-auto max-w-md text-center">
        <h2 className="mb-2 text-2xl font-bold text-red-400">
          {league.leagueName}
        </h2>
        <p className="mb-5 text-sm text-gray-400">Season: {league.season}</p>
        <div className="grid grid-cols-2 gap-4">
          <Fact label="Teams" value={league.teamCount} />
          <Fact
            label="Seasons Tracked"
            value={(history?.years.length || 0) + 1}
          />
          <div className="col-span-2">
            <Fact
              label="Reigning Champion"
              value={
                champion ? (
                  <>
                    <span className="block">{champion.Owner}</span>
                    <span className="text-sm font-normal text-gray-300">
                      {champion.Team} · {champion.Season}
                    </span>
                  </>
                ) : (
                  "Unavailable"
                )
              }
            />
          </div>
          <div className="col-span-2">
            <Fact
              label="All-Time Titles Leader"
              value={
                titleLeader
                  ? `${titleLeader[0]} (${titleLeader[1]})`
                  : "Unavailable"
              }
            />
          </div>
        </div>
        <p className="mt-5 text-xs text-gray-400">
          {league.settings.playoffTeamCount ?? "—"} playoff teams ·{" "}
          {league.settings.regularSeasonMatchups ?? "—"} regular-season matchups
        </p>
        {history?.notes.length ? (
          <p role="alert" className="mt-3 text-sm text-amber-300">
            Some historical seasons are unavailable.
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/standings" className={CREAM_BUTTON}>
            Standings
          </Link>
          <Link href="/teams" className={CREAM_BUTTON}>
            Teams
          </Link>
          <Link href="/all-time" className={CREAM_BUTTON}>
            All-Time
          </Link>
        </div>
      </AccentPanel>
      <div className="mt-8 text-center">
        <a
          href={leagueUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300"
        >
          Open League on ESPN ↗
        </a>
      </div>
    </PageShell>
  );
}
