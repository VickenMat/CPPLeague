import {
  AccentPanel,
  CREAM_BUTTON,
  Fact,
  PageShell,
} from "../components/LeagueUI";
import { getLeagueHistory } from "../../../lib/league-history";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeagueSummary } from "../../../lib/getLeagueSummary";
import { getLeagueRoster } from "../../../lib/league-roster";

type Player = {
  id: number;
  name: string;
  position: string;
  nflTeam?: string;
  lineupSlot?: string;
};

export default async function TeamPage({ teamId }: { teamId: string }) {
  const league = await getLeagueSummary();
  const team = league.teams.find((team) => String(team.id) === teamId);
  if (!team) notFound();
  let roster: { players: Player[] } | null = null;
  try {
    roster = await getLeagueRoster(teamId, String(league.season));
  } catch {
    /* Show the team even if ESPN's roster service is unavailable. */
  }
  const record = team.record?.overall || {};
  const history = await getLeagueHistory().catch(() => null);
  const seasons = (history?.raw || [])
    .filter((row) => String(row.TeamId) === teamId)
    .sort((a, b) => Number(b.Season) - Number(a.Season));
  const groups = [
    [
      "Starters",
      (roster?.players || []).filter(
        (player) => !["BE", "IR"].includes(player.lineupSlot || "BE"),
      ),
    ],
    [
      "Bench",
      (roster?.players || []).filter(
        (player) => !player.lineupSlot || player.lineupSlot === "BE",
      ),
    ],
    [
      "Injured Reserve",
      (roster?.players || []).filter((player) => player.lineupSlot === "IR"),
    ],
  ] as const;
  return (
    <PageShell
      title={team.name}
      subtitle={
        <>
          <Link href="/teams" className="text-blue-400 hover:text-blue-300">
            Teams
          </Link>{" "}
          · {league.season}
          <div className="mt-2 text-sm">
            Owner: <span className="font-mono">{team.displayOwner}</span>
            {team.abbrev ? ` · ${team.abbrev}` : ""}
          </div>
        </>
      }
      width="max-w-6xl"
    >
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact
          label="Seasons"
          value={
            seasons.length
              ? `${seasons.at(-1)?.Season}–${seasons[0].Season}`
              : "—"
          }
        />
        <Fact
          label="Current Record"
          value={`${record.wins ?? 0}-${record.losses ?? 0}${record.ties ? `-${record.ties}` : ""}`}
        />
        <Fact label="Season PF" value={team.pointsFor.toFixed(2)} />
        <Fact label="Season PA" value={team.pointsAgainst.toFixed(2)} />
      </div>
      <AccentPanel tone="blue">
        <h2 className="mb-5 text-center text-2xl font-bold">Roster</h2>
        {!roster ? (
          <p role="alert" className="mt-4 text-amber-300">
            The roster could not be loaded from ESPN. Please try again.
          </p>
        ) : !roster.players.length ? (
          <p className="mt-4 text-gray-400">No players on this roster.</p>
        ) : (
          groups.map(
            ([label, players]) =>
              players.length > 0 && (
                <section key={label} className="mt-6">
                  <h3 className="mb-3 text-center text-lg font-bold text-[#FFB81C]">
                    {label}
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-800">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5">
                        <tr>
                          {["Slot", "Player", "Position", "NFL Team"].map(
                            (title) => (
                              <th key={title} className="px-4 py-3">
                                {title}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((player) => (
                          <tr
                            key={player.id}
                            className="border-t border-gray-800"
                          >
                            <td className="px-4 py-3">
                              {player.lineupSlot || "—"}
                            </td>
                            <td className="px-4 py-3 font-semibold">
                              {player.name}
                            </td>
                            <td className="px-4 py-3">{player.position}</td>
                            <td className="px-4 py-3">
                              {player.nflTeam || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ),
          )
        )}
      </AccentPanel>
      <AccentPanel className="mt-8">
        <h2 className="text-center text-2xl font-bold">Franchise History</h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Completed seasons for this ESPN team ID. Each row shows that season’s
          manager.
        </p>
        {!history ? (
          <p role="alert" className="mt-4 text-amber-300">
            History is temporarily unavailable.
          </p>
        ) : (
          <>
            {history.notes.length > 0 && (
              <p role="alert" className="mt-3 text-sm text-amber-300">
                Some historical records could not be loaded.
              </p>
            )}
            {!seasons.length ? (
              <p className="mt-4 text-gray-400">
                No completed seasons are available for this franchise.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5">
                    <tr>
                      {[
                        "Season",
                        "Manager",
                        "Team",
                        "Finish",
                        "Record",
                        "PF",
                        "PA",
                      ].map((title) => (
                        <th key={title} className="px-4 py-3">
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {seasons.map((row) => (
                      <tr
                        key={String(row.Season)}
                        className="border-t border-gray-800"
                      >
                        <td className="px-4 py-3">{row.Season}</td>
                        <td className="px-4 py-3">{row.Owner}</td>
                        <td className="px-4 py-3">{row.Team}</td>
                        <td className="px-4 py-3">{row.Rank}</td>
                        <td className="px-4 py-3">
                          {row.Wins}-{row.Losses}
                          {row.Ties ? `-${row.Ties}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          {Number(row.PF).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {Number(row.PA).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </AccentPanel>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/all-time" className={CREAM_BUTTON}>
          League history →
        </Link>
        <a
          href={`https://fantasy.espn.com/football/team?leagueId=${league.leagueId}&seasonId=${league.season}&teamId=${teamId}`}
          className={CREAM_BUTTON}
          target="_blank"
          rel="noopener noreferrer"
        >
          Team on ESPN ↗
        </a>
      </div>
    </PageShell>
  );
}
