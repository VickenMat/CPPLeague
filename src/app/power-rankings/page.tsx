// src/app/power-rankings/page.tsx
import PowerRanking from '../components/PowerRanking';
import PRDomPatcher from '../components/PRDomPatcher';
import { serverBaseUrl } from '../../../lib/serverUrl';
import { fetchJson } from '../../../lib/http';

type Row = { teamName: string; avgRank: number | null; points: number };
type Aggregate = { league: 'A' | 'B'; updatedAt: string; ballots: number; rankings: Row[] };

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const fmtAvg = (v: number | null) => (v == null ? '—' : v.toFixed(2));

async function getAggregate(league: 'A' | 'B'): Promise<Aggregate | null> {
  try {
    const base = await serverBaseUrl();
    return await fetchJson<Aggregate>(`${base}/api/power-rankings/aggregate?league=${league}`);
  } catch {
    return null;
  }
}

/* Same accent frame for both cards: full colored border + thin top bar */
function accentWrap(color: 'red' | 'blue') {
  const colorCls =
    color === 'red'
      ? 'border-red-600 before:bg-red-600'
      : 'border-blue-600 before:bg-blue-600';

  return [
    'relative rounded-2xl border-2 bg-black/20 shadow-lg',
    'before:absolute before:left-0 before:top-0 before:h-1.5 before:w-full before:rounded-t-2xl before:content-[""]',
    colorCls,
  ].join(' ');
}

export default async function PowerRankingsPage() {
  const [aggA, aggB] = await Promise.all([getAggregate('A'), getAggregate('B')]);

  return (
    <div className="min-h-screen relative text-white px-6 py-10 bg-gradient-to-br from-gray-900 to-black">
      {/* Static background logo */}
      <img
        src="/logo_transparent.png"
        alt="Background Logo"
        className="fixed inset-0 w-full h-full object-contain opacity-[0.08] pointer-events-none select-none"
        style={{ objectPosition: 'center' }}
      />

      {/* Page content */}
      <div className="relative z-10">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-extrabold">Power Rankings</h1>
          <p className="text-gray-400 mt-1">Community aggregate from submitted ballots.</p>
        </header>

        {/* Aggregate cards */}
        <section className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={accentWrap('red')}>
            <div className="p-4">
              <AggregateCard title="League A" data={aggA} />
            </div>
          </div>
          <div className={accentWrap('blue')}>
            <div className="p-4">
              <AggregateCard title="League B" data={aggB} />
            </div>
          </div>
        </section>

        {/* Interactive board */}
        <section id="pr-board" className="max-w-6xl mx-auto mt-12">
          <PRDomPatcher />
          <PowerRanking />
        </section>
      </div>
    </div>
  );
}

/* ----------------------------- helpers/components ----------------------------- */

function AggregateCard({ title, data }: { title: string; data: Aggregate | null }) {
  if (!data) {
    return (
      <div>
        <h3 className="text-xl font-semibold mb-2 text-center text-white">{title}</h3>
        <div className="text-gray-400 text-center">Failed to load aggregate.</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-semibold mb-3 text-center text-white">{title}</h3>

      <div className="flex flex-wrap gap-2 mb-3 justify-center">
        <StatBadge label="Ballots" value={data.ballots} title="Number of ballots included" />
        <StatBadge
          label="Updated"
          value={new Date(data.updatedAt).toLocaleString()}
          title={data.updatedAt}
        />
      </div>

      {(!data.rankings || data.rankings.length === 0) ? (
        <div className="text-gray-500 text-center">No rankings yet.</div>
      ) : (
        <ol className="list-decimal pl-5 space-y-1 text-gray-300">
          {data.rankings.map((row) => (
            <li key={row.teamName} className="flex items-baseline justify-between gap-3">
              <span className="truncate">{row.teamName}</span>
              <span className="text-sm text-gray-400">
                avg {fmtAvg(row.avgRank)} • {row.points} pts
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StatBadge({
  label,
  value,
  title,
}: {
  label: string;
  value: string | number;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300"
    >
      <span className="opacity-70">{label}:</span>
      <strong className="text-white">{value}</strong>
    </span>
  );
}
