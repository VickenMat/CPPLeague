import { PageShell, AccentPanel } from "../components/LeagueUI";
import PowerRanking from "../components/PowerRanking";
export default function PowerRankingsPage() {
  return (
    <PageShell title="Power Rankings" subtitle="Your league. Your tiers.">
      <AccentPanel>
        <p className="mt-4 text-center text-gray-400">
          Rank your league’s teams. Your board is saved in this browser.
        </p>
        <PowerRanking />
      </AccentPanel>
    </PageShell>
  );
}
