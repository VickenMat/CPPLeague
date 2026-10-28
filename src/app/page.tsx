import Link from "next/link";
import { getLeagueSummary } from "../../lib/getLeagueSummary";
import { leagueUrl } from "../../lib/league";

export const dynamic = "force-dynamic";

export default async function Home() {
  const league = await getLeagueSummary().catch(() => null);
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 text-center">
      <h1 className="text-4xl font-extrabold sm:text-5xl">
        {league?.leagueName || "CPP Fantasy Football"}
      </h1>
      <p className="mt-4 text-gray-300">
        Your league’s teams, standings, and season tools in one place.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {[
          ["/standings", "Standings"],
          ["/teams", "Teams"],
          ["/all-time", "All-Time Records"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl bg-[#D9D7B6] px-5 py-3 font-semibold text-black"
          >
            {label}
          </Link>
        ))}
        <a
          href={leagueUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-gray-700 px-5 py-3"
        >
          Open ESPN ↗
        </a>
      </div>
      {league ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ["Season", league.season],
            ["Teams", league.teamCount],
            ["Playoff Teams", league.settings.playoffTeamCount ?? "—"],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-gray-800 bg-white/5 p-6"
            >
              <div className="text-gray-400">{label}</div>
              <div className="mt-2 text-3xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <p role="alert" className="mt-8 text-amber-300">
          ESPN data is temporarily unavailable. Try again shortly.
        </p>
      )}
      <div className="mt-10 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
        {[
          [
            "/leagues",
            "League Overview",
            "League settings and previous champions.",
          ],
          ["/draft", "Draft", "Draft results and general NFL rankings."],
          [
            "/trade",
            "Trade Calculator",
            "Compare players from your league’s rosters.",
          ],
          ["/waivers", "Waivers", "Available players and transaction history."],
          [
            "/power-rankings",
            "Power Rankings",
            "Build a personal team ranking.",
          ],
          ["/rules", "Rules", "League rules and settings on ESPN."],
        ].map(([href, title, description]) => (
          <Link
            key={href}
            href={href}
            className="rounded-2xl border border-gray-800 p-6 transition hover:bg-white/5"
          >
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-2 text-gray-400">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
