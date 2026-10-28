import { teamInitials } from "../../../lib/team-display";
// src/app/teams/page.tsx
import Link from "next/link";
import { getLeagueSummary } from "../../../lib/getLeagueSummary";
import TeamsControls from "./_Controls";
import { parseSearchText, parseSortOption } from "../../../lib/validation";

type Team = {
  id: number | string;
  name: string;
  abbrev?: string;
  primaryOwner?: string;
  displayOwner?: string;
  owners?: string[];
  record?: { overall?: { wins?: number; losses?: number; ties?: number } };
  pointsFor?: number;
  pointsAgainst?: number;
  playoffSeed?: number;
  rank?: number;
  logo?: string;
};

type Userish = {
  id?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  nickname?: string;
  teamId?: number | string;
};

type LeagueSummary = {
  leagueId: string;
  leagueName: string;
  season: number | string;
  teams: Team[];
  users?: Userish[];
  ownersMap?: Record<string, string>;
  owners?: Array<{ id: string; displayName?: string }>;
};

/* ------------------------ small UI helpers ------------------------ */
function hashColor(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++)
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 18%)`;
}

/** Only box accent (randomized but deterministic red/blue/orange) for team tiles */
function boxAccent(key: string) {
  const idx =
    Math.abs(
      Array.from(key).reduce(
        (h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0,
        0,
      ),
    ) % 3;
  return [
    "hover:border-red-500/70 focus-visible:outline-red-500/60",
    "hover:border-blue-500/70 focus-visible:outline-blue-500/60",
    "hover:border-orange-500/70 focus-visible:outline-orange-500/60",
  ][idx];
}

/** Standings-style section accent (ring + inset top stripe) */
function sectionAccent() {
  return "rounded-2xl border border-gray-800 bg-black/30";
}

/* ------------------------ data helpers ------------------------ */
function resolveOwnerName(L: LeagueSummary, t: Team): string {
  if (t.displayOwner) return t.displayOwner;

  const primary = t.primaryOwner || t.owners?.[0];
  if (primary && L.ownersMap?.[primary]) return L.ownersMap[primary];

  if (primary && Array.isArray(L.users)) {
    const u = L.users.find(
      (x) =>
        x?.userId === primary ||
        x?.id === primary ||
        String(x?.id) === String(primary),
    );
    if (u)
      return (
        u.displayName ||
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        u.nickname ||
        "Unknown"
      );
  }

  if (primary && Array.isArray(L.owners)) {
    const o = L.owners.find((o) => o.id === primary);
    if (o?.displayName) return o.displayName;
  }

  if (Array.isArray(L.users)) {
    const u2 = L.users.find((x) => String(x?.teamId) === String(t.id));
    if (u2)
      return (
        u2.displayName ||
        [u2.firstName, u2.lastName].filter(Boolean).join(" ") ||
        u2.nickname ||
        "Unknown"
      );
  }

  return "Unknown";
}

function filterAndSortTeams(
  teams: Team[],
  q: string | undefined,
  sort: "name" | "person" | "abbrev",
  resolvePerson: (t: Team) => string,
) {
  let list = teams;
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter((t) =>
      [t.name, t.abbrev, resolvePerson(t)].some((s) =>
        (s ?? "").toLowerCase().includes(needle),
      ),
    );
  }
  list = [...list].sort((a, b) => {
    const ax =
      (sort === "name"
        ? a.name
        : sort === "abbrev"
          ? (a.abbrev ?? "")
          : resolvePerson(a)
      )?.toLowerCase() ?? "";
    const bx =
      (sort === "name"
        ? b.name
        : sort === "abbrev"
          ? (b.abbrev ?? "")
          : resolvePerson(b)
      )?.toLowerCase() ?? "";
    return ax.localeCompare(bx);
  });
  return list;
}

/* ----------------------------- page ----------------------------- */
type SearchParamsShape = {
  leagueId?: string;
  q?: string;
  sort?: "name" | "person" | "abbrev";
  showIds?: string;
};

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const season = process.env.ESPN_SEASON || "";
  if (!season) throw new Error("Missing ESPN_SEASON");

  const sp: SearchParamsShape = (await searchParams) || {};

  const q = parseSearchText(sp.q);
  const sort = parseSortOption(sp.sort) as "name" | "person" | "abbrev";
  const showIds = sp.showIds === "1";

  const leagues: LeagueSummary[] = [await getLeagueSummary({ season })];
  const totalTeams = leagues[0].teams.length;

  return (
    <div
      className="min-h-screen relative text-white"
      style={{
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "contain",
      }}
    >
      {/* Reliable 8% overlay regardless of Tailwind config */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      />

      {/* Content above the overlay */}
      <div className="relative max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-extrabold text-center mb-2">Teams</h1>
        <p className="text-center text-gray-300 mb-8">
          Season <span className="font-mono">{season}</span> · {totalTeams} team
          {totalTeams === 1 ? "" : "s"}
        </p>

        <TeamsControls initialQ={q} initialSort={sort} showIds={showIds} />

        <div className="space-y-10">
          {leagues.map((L) => {
            const resolvePerson = (t: Team) => resolveOwnerName(L, t);
            const filtered = filterAndSortTeams(
              L.teams ?? [],
              q,
              sort,
              resolvePerson,
            );

            return (
              <section key={L.leagueId} className={sectionAccent()}>
                <div className="p-5">
                  {/* Centered league title */}
                  <h2 className="text-2xl font-bold text-center">
                    {L.leagueName}
                  </h2>
                  <div className="text-center text-gray-400 mb-4">
                    ({filtered.length} team{filtered.length === 1 ? "" : "s"})
                  </div>

                  {filtered.length === 0 ? (
                    <div className="rounded-xl border border-gray-800 bg-black/30 p-6 text-gray-400">
                      No teams match your filters in this league.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map((t) => {
                        const person = resolvePerson(t);
                        const displayName = t.name ?? `Team ${t.id}`;
                        const href = `/teams/${encodeURIComponent(String(t.id))}`;
                        const bg = hashColor(displayName || person);
                        const avatarText = teamInitials(displayName || person);

                        const rec = t.record?.overall ?? {};
                        const wins = rec.wins ?? 0;
                        const losses = rec.losses ?? 0;
                        const ties = rec.ties ?? 0;
                        const pf = t.pointsFor ?? 0;
                        const pa = t.pointsAgainst ?? 0;
                        const seed = t.playoffSeed ?? t.rank ?? "–";

                        const accent = boxAccent(
                          String(t.id) + ":" + (t.abbrev ?? displayName),
                        );

                        return (
                          <Link
                            key={t.id}
                            href={href}
                            className={[
                              "group rounded-xl border border-gray-800 bg-black/30 p-4 transition",
                              "hover:bg-black/40",
                              accent,
                            ].join(" ")}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="h-10 w-10 shrink-0 rounded-full grid place-items-center text-sm font-bold"
                                style={{ background: bg }}
                                aria-hidden
                              >
                                {avatarText}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="font-semibold truncate text-white">
                                    {displayName}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    {showIds ? (
                                      <span className="text-[10px] text-gray-500 border border-gray-800 rounded px-1.5 py-0.5">
                                        ID: {String(t.id)}
                                      </span>
                                    ) : null}
                                    {t.abbrev ? (
                                      <span className="text-[10px] uppercase tracking-wide text-gray-400 border border-gray-800 rounded px-1.5 py-0.5">
                                        {t.abbrev}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <p className="text-gray-400 text-sm mt-1 truncate">
                                  Owner:{" "}
                                  <span className="font-mono">{person}</span>
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                              <div className="rounded-lg border border-gray-800 bg-black/20 p-2">
                                <div className="text-gray-400">Record</div>
                                <div className="mt-0.5 font-semibold">
                                  {wins}-{losses}
                                  {ties ? `-${ties}` : ""}
                                </div>
                              </div>
                              <div className="rounded-lg border border-gray-800 bg-black/20 p-2">
                                <div className="text-gray-400">PF</div>
                                <div className="mt-0.5 font-semibold">
                                  {pf.toFixed(1)}
                                </div>
                              </div>
                              <div className="rounded-lg border border-gray-800 bg-black/20 p-2">
                                <div className="text-gray-400">PA</div>
                                <div className="mt-0.5 font-semibold">
                                  {pa.toFixed(1)}
                                </div>
                              </div>
                              <div className="rounded-lg border border-gray-800 bg-black/20 p-2">
                                <div className="text-gray-400">Seed</div>
                                <div className="mt-0.5 font-semibold">
                                  #{seed}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
