import Link from "next/link";
import { getLeagueSummary } from "../../lib/getLeagueSummary";
import { leagueUrl } from "../../lib/league";
import {
  AccentPanel,
  CREAM_BUTTON,
  Fact,
  PageShell,
} from "./components/LeagueUI";

export const dynamic = "force-dynamic";

export default async function Home() {
  const league = await getLeagueSummary().catch(() => null);
  return (
    <PageShell
      title="Welcome to CPP 🏈"
      subtitle={league?.leagueName || "CPP Fantasy Football"}
    >
      <div className="flex flex-wrap justify-center gap-3">
        {[
          ["/standings", "View Standings"],
          ["/teams", "View Teams"],
          ["/all-time", "All-Time Leaders"],
        ].map(([href, label]) => (
          <Link key={href} href={href} className={CREAM_BUTTON}>
            {label}
          </Link>
        ))}
      </div>
      <div className="mx-auto mt-10 max-w-md">
        <AccentPanel>
          <h2 className="text-center text-2xl font-bold text-red-400">
            {league?.leagueName || "CPP Fantasy Football"}
          </h2>
          <p className="mb-5 mt-2 text-center text-gray-400">
            One league. Every season.
          </p>
          {league ? (
            <div className="grid grid-cols-2 gap-3">
              <Fact label="Teams" value={league.teamCount} />
              <Fact label="Season" value={league.season} />
              <Fact
                label="Playoff Teams"
                value={league.settings.playoffTeamCount ?? "—"}
              />
              <Fact
                label="Regular Season"
                value={
                  league.settings.regularSeasonMatchups == null
                    ? "—"
                    : `${league.settings.regularSeasonMatchups} matchups`
                }
              />
            </div>
          ) : (
            <p role="alert" className="text-center text-amber-300">
              ESPN data is temporarily unavailable. Please try again shortly.
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/leagues"
              className={CREAM_BUTTON + " text-sm"}
            >
              League Overview
            </Link>
            <a
              href={leagueUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={CREAM_BUTTON + " text-sm"}
            >
              League Site ↗
            </a>
          </div>
        </AccentPanel>
      </div>
      <section className="mt-12 text-center">
        <h2 className="mb-5 text-2xl font-bold">Tools</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [
              "/draft",
              "Draft Center",
              "Season draft order, results, and Top 300 rankings.",
            ],
            [
              "/trade",
              "Trade Calculator",
              "Compare players from your league’s live rosters.",
            ],
            [
              "/waivers",
              "Waivers & Free Agents",
              "Available players, waiver status, and transaction history.",
            ],
            [
              "/power-rankings",
              "Power Rankings",
              "Build and save your personal team ranking.",
            ],
            [
              "/rules",
              "Rules",
              "Roster settings, playoffs, and official ESPN rules.",
            ],
            [
              "/media",
              "Media",
              "Your league’s photos, videos, and highlights.",
            ],
          ].map(([href, title, description]) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-gray-800 bg-black/30 p-5 transition hover:bg-black/50"
            >
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-gray-300">{description}</p>
              <div className="mt-3 text-sm text-blue-400 group-hover:text-blue-300">
                Open →
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-12 text-center">
        <h2 className="mb-5 text-2xl font-bold">Around the League</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-black/30 p-5">
            <h3 className="font-semibold">Season Snapshot</h3>
            <p className="mt-2 text-sm text-gray-300">
              {league
                ? `${league.teamCount} teams competing in the ${league.season} season.`
                : "Check ESPN for the latest league updates."}
            </p>
            <Link
              href="/standings"
              className="mt-3 inline-block text-sm text-blue-400"
            >
              View Standings →
            </Link>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-black/30 p-5">
            <h3 className="font-semibold">League History</h3>
            <p className="mt-2 text-sm text-gray-300">
              Past champions, franchise records, and the matchups that made
              them.
            </p>
            <Link
              href="/all-time"
              className="mt-3 inline-block text-sm text-blue-400"
            >
              All-Time Leaders →
            </Link>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-black/30 p-5">
            <h3 className="font-semibold">Commissioner’s Corner</h3>
            <p className="mt-2 text-sm text-gray-300">
              Visit your league on ESPN for announcements and commissioner
              messages.
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-block text-sm text-blue-400"
            >
              Contact →
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
