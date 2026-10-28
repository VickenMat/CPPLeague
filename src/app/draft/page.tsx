import { getLeagueSummary } from "../../../lib/getLeagueSummary";
import { getLeagueDraft } from "../../../lib/league-draft";
import Rankings from "./Rankings";
export const dynamic = "force-dynamic";

export default async function DraftPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const league = await getLeagueSummary();
  const params = await searchParams;
  const years = [
    ...new Set<number>([Number(league.season), ...league.previousSeasons]),
  ].sort((a, b) => b - a);
  const selected = Number(params.season || league.season);
  const season = years.includes(selected) ? selected : Number(league.season);
  const draft = await getLeagueDraft(season).catch(() => null);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center text-4xl font-bold">Draft</h1>
      <form className="mt-6 flex justify-center gap-3">
        <label className="sr-only" htmlFor="draft-season">
          Draft season
        </label>
        <select
          id="draft-season"
          name="season"
          defaultValue={season}
          className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2"
        >
          {years.map((year) => (
            <option key={year}>{year}</option>
          ))}
        </select>
        <button className="rounded-lg border border-gray-700 px-4 py-2">
          View season
        </button>
      </form>
      {!draft ? (
        <p role="alert" className="mt-6 text-center text-amber-300">
          Draft data could not be loaded from ESPN. Please try again.
        </p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-center text-2xl font-bold">
              {season} Draft Order
            </h2>
            {draft.order.length ? (
              <ol className="mx-auto mt-4 max-w-xl list-inside list-decimal space-y-2 rounded-xl border border-gray-800 p-5">
                {draft.order.map((team) => (
                  <li key={team.id}>{team.name}</li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-center text-gray-400">
                ESPN has not published a draft order.
              </p>
            )}
          </section>
          <section className="mt-8">
            <h2 className="text-center text-2xl font-bold">
              {season} Draft Results
            </h2>
            {!draft.picks.length ? (
              <p className="mt-4 text-center text-gray-400">
                No draft picks are recorded for this season yet.
              </p>
            ) : (
              <div className="mt-4 max-h-[36rem] overflow-auto rounded-xl border border-gray-800">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-950">
                    <tr>
                      {["Round", "Pick", "Player", "Team", "Keeper"].map(
                        (title) => (
                          <th key={title} className="px-4 py-3">
                            {title}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.picks.map((pick) => (
                      <tr key={pick.pick} className="border-t border-gray-800">
                        <td className="px-4 py-3">{pick.round}</td>
                        <td className="px-4 py-3">{pick.pick}</td>
                        <td className="px-4 py-3 font-semibold">
                          {pick.player}
                        </td>
                        <td className="px-4 py-3">{pick.team}</td>
                        <td className="px-4 py-3">
                          {pick.keeper ? "Yes" : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      <Rankings />
    </div>
  );
}
