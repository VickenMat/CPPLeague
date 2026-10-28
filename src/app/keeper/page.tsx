import {
  fetchLeagueData,
  getLeagueSummary,
} from "../../../lib/getLeagueSummary";
export const dynamic = "force-dynamic";
export default async function KeeperPage() {
  const league = await getLeagueSummary();
  const data = await fetchLeagueData(Number(league.season), [
    "mSettings",
    "mDraftDetail",
    "mTeam",
    "mRoster",
  ]);
  const count = data.settings?.draftSettings?.keeperCount;
  const keepers = (data.draftDetail?.picks || []).filter(
    (pick: any) => pick.keeper,
  );
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h1 className="text-4xl font-bold">Keepers</h1>
      <p className="mt-5 text-gray-300">
        {count === 0
          ? "ESPN has no keepers enabled for this season."
          : count != null
            ? `ESPN allows ${count} keeper(s) per team.`
            : "Keeper settings are unavailable from ESPN."}
      </p>
      <p className="mt-3 text-gray-400">
        {keepers.length
          ? `${keepers.length} keeper selections are recorded in the ESPN draft. View them on the draft page.`
          : "No keeper selections are recorded in the ESPN draft."}
      </p>
      <a href="/draft" className="mt-6 inline-block text-sky-300">
        View draft →
      </a>
    </div>
  );
}
