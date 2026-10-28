import PowerRanking from "../components/PowerRanking";
export default function PowerRankingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-center text-4xl font-bold">Power Rankings</h1>
      <p className="mt-4 text-center text-gray-400">
        Rank your league’s teams. Your board is saved in this browser.
      </p>
      <PowerRanking />
    </div>
  );
}
