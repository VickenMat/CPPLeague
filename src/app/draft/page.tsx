/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

/* ------------------------ Draft Orders (edit as needed) ------------------------ */
const DRAFT_ORDER_A = [
  'Nareg Aboyan', 'Gregory Cormier', 'Jacob Naroian', 
  'Garen Soukiasian', 'Aren Dakessian', 'Shant Poladian', 
  'Aren Banklian', 'Vicken Matiossian', 'Alec Peltekian', 
  'Andy Sisitzky', 'Raphael Yeremian', 'Violette Dekirmenjian',
];

const DRAFT_ORDER_B = [
  'Garo Bazarbachian', 'Shant Alashaian', 'Alex Matiossian',
  'Ara Changelian', 'Vahey Mouradian', 'Alec Soghomonian',
  'Kevork DerKevorkian', 'Vicken Matiossian ', 'Tadeh DerStepanian',
  'Vasken Kebabjian', 'Armen Surenian', 'Vadik Bagdasarian',
];

/** New C league placeholders — replace when ready */
const DRAFT_ORDER_C = [
  'Armen Krikorian', 'Parker Harrington', 'Brianna Lundin',
  'Alex Abrahamyan', 'Daron Hovsepian', 'Ara Naroian',
  'Karyl Ashjian', 'Vicken Matiossian', 'Anto Atinizian',
  'Alec Maserejian', 'Hampton Trout', 'Njteh Hovsepian', 
];

/* Location of the PDF in /public */
const POSITIONAL_TOP300_PDF = '/positional_top300_2026.pdf';
const DRAFT_ORDER_PDF = '/order.pdf';

/* ------------------------------ Types & helpers ------------------------------- */
type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'D/ST' | 'K';

type CsvPlayer = {
  Rank?: string;
  Name?: string;
  Position?: string;
  NFL?: string;
  Team?: string;
  Tm?: string;
};

type Player = { rank: number; name: string; pos: Pos; team?: string };
type ParsedPlayer = { rank: number; name: string; pos: string; team?: string };

const POS_COLOR_TEXT: Record<Pos, string> = {
  QB: 'text-red-400',
  RB: 'text-green-400',
  WR: 'text-blue-400',
  TE: 'text-orange-400',
  'D/ST': 'text-purple-400',
  K: 'text-yellow-300',
};

function isValidPos(pos: string): pos is Pos {
  return ['QB', 'RB', 'WR', 'TE', 'D/ST', 'K'].includes(pos);
}

function normalizePos(pos: string): string {
  return pos === 'DST' ? 'D/ST' : pos;
}

function chunkBySize<T>(arr: T[], size: number): T[][] {
  const cols: T[][] = [];
  for (let i = 0; i < arr.length; i += size) cols.push(arr.slice(i, i + size));
  return cols;
}

/* Accent color handling for Top 300 search input (still random on focus) */
type Accent = 'red' | 'blue' | 'orange';
const pickRandomAccent = (): Accent =>
  (['red', 'blue', 'orange'][Math.floor(Math.random() * 3)] as Accent);

/** Standings/Teams-style section accent used for Draft Order cards */
function sectionAccentByKey(k: 'A' | 'B' | 'C') {
  const ring =
    k === 'A' ? 'ring-red-500/40 before:bg-red-500'
    : k === 'B' ? 'ring-blue-500/40 before:bg-blue-500'
    :            'ring-orange-500/40 before:bg-orange-500';
  return [
    'relative rounded-2xl border border-gray-800 bg-black/30 ring-1',
    ring,
    'before:absolute before:left-4 before:right-4 before:top-0 before:h-1.5 before:rounded-full content-[""]',
  ].join(' ');
}
const titleColorByKey = (k: 'A' | 'B' | 'C') =>
  k === 'A' ? 'text-red-400' : k === 'B' ? 'text-blue-400' : 'text-orange-400';

/* --------------------------------- Page --------------------------------- */
export default function DraftPage() {
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<Pos | 'ALL'>('ALL');

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  // CSV target selection (for the “Draft Results” card)
  const [csvTarget, setCsvTarget] = useState<'top300' | 'grades'>('top300');

  // Accent for Top 300 search input ring
  const [accent, setAccent] = useState<Accent>('red');

  useEffect(() => {
    setLoading(true);
    setLoadErr(null);

    fetch('/top300_2026.json', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load rankings [${res.status}]`);
        return res.json();
      })
      .then((data: unknown) => {
        const source = Array.isArray(data) ? (data as CsvPlayer[]) : [];
        const rows = source
          .map<ParsedPlayer>((r) => {
            const rank = Number(String(r.Rank ?? '').trim());
            const name = String(r.Name ?? '').trim();
            const rawPos = normalizePos(String(r.Position ?? '').trim().toUpperCase());
            const rawTeam = (r.NFL ?? r.Team ?? r.Tm ?? '').toString().trim().toUpperCase();
            return { rank, name, pos: rawPos, team: rawTeam || undefined };
          })
          .filter((p): p is Player => Boolean(p.rank && p.name && isValidPos(p.pos)))
          .sort((a, b) => a.rank - b.rank)
          .slice(0, 300);

        setPlayers(rows);
      })
      .catch((e: any) => {
        setLoadErr(e?.message ?? 'Failed to load Top 300 JSON.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return players.filter((p) => {
      const byPos = posFilter === 'ALL' ? true : p.pos === posFilter;
      const byText = t
        ? p.name.toLowerCase().includes(t) || (p.team ?? '').toLowerCase().includes(t)
        : true;
      return byPos && byText;
    });
  }, [players, posFilter, query]);

  const columns = useMemo(() => chunkBySize(filtered, 100), [filtered]);

  const ALL_TEAMS = [...DRAFT_ORDER_A, ...DRAFT_ORDER_B, ...DRAFT_ORDER_C];

  /* ----------------------------- CSV helpers ----------------------------- */
  function downloadCSV(rows: object[], filename: string) {
    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportTop300CSV() {
    if (!players.length) {
      alert('Player list is not loaded yet.');
      return;
    }
    const rows = players.map((p) => ({
      Rank: p.rank,
      Name: p.name,
      Position: p.pos,
      Team: p.team ?? '',
    }));
    downloadCSV(rows, 'anff-top-300.csv');
  }

  function exportGradesCSV() {
    // Placeholder grades; wire to real grades later
    const rows = ALL_TEAMS.map((team) => ({
      Team: team.trim(),
      Grade: '—',
      Notes: 'Grades coming soon.',
    }));
    downloadCSV(rows, 'anff-draft-grades.csv');
  }

  function handleExportCSV() {
    if (csvTarget === 'top300') exportTop300CSV();
    else exportGradesCSV();
  }

  return (
    <div className="relative min-h-screen text-white">
      {/* Background stack: 1) faint logo 2) translucent gradient to keep readability */}
      <div className="fixed inset-0 -z-10">
        <img
          src="/logo_transparent.png"
          alt="ANFF watermark"
          className="w-full h-full object-contain opacity-[0.25] pointer-events-none select-none"
          style={{ objectPosition: 'center' }}
        />
        {/* 70% gradient so the 8% logo shows through */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 to-black/70" />
      </div>

      {/* Content (no opaque background here) */}
      <div className="relative z-10 min-h-screen px-6 py-10">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold">Draft Center</h1>
        </header>

        {/* Draft Order — centered (TOP) */}
        <section className="mx-auto w-full max-w-6xl text-center">
          <h2 className="text-2xl font-bold mb-6">Draft Order</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
            <LeagueOrder leagueKey="A" names={DRAFT_ORDER_A} />
            <LeagueOrder leagueKey="B" names={DRAFT_ORDER_B} />
            <LeagueOrder leagueKey="C" names={DRAFT_ORDER_C} />
          </div>
        </section>

        {/* Top 300 — moved to the bottom (above PDF) */}
        <section className="mx-auto w-full max-w-6xl mt-12">
          <h2 className="text-2xl font-bold text-center">Top 300 Players</h2>

          {/* Search + Filter */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setAccent(pickRandomAccent())}
              placeholder="Search players or team (e.g., KC, DAL)…"
              className={[
                'px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 w-full max-w-md',
                accent === 'red' ? 'focus:ring-red-400' : accent === 'blue' ? 'focus:ring-blue-400' : 'focus:ring-orange-400',
              ].join(' ')}
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <PositionFilter value={posFilter} onChange={setPosFilter} />
            </div>
          </div>

          {loading && (
            <div className="mt-6 rounded-2xl border border-gray-800 bg-black/20 p-5 text-center text-gray-300">
              Loading players…
            </div>
          )}
          {loadErr && (
            <div className="mt-6 rounded-2xl border border-red-800 bg-red-950/40 p-5 text-center text-red-200">
              {loadErr}
            </div>
          )}

          {!loading && !loadErr && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {columns.map((col, colIdx) => (
                <ul key={colIdx} className="space-y-2">
                  {col.map((p) => (
                    <li key={p.rank} className="flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-2 truncate">
                        <span className="text-gray-400 tabular-nums w-10 text-right">{p.rank}.</span>
                        <span className="font-medium truncate">{p.name}</span>
                        {p.team && <span className="text-gray-400 text-sm truncate">({p.team})</span>}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border border-transparent ${POS_COLOR_TEXT[p.pos]}`}
                        title={p.pos}
                      >
                        {p.pos}
                      </span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          )}
        </section>

        <PdfSection
          title="Positional Top 300"
          pdfPath={POSITIONAL_TOP300_PDF}
          downloadName="Download PDF"
          openLabel="Open in new tab"
        />

        {/* Draft Results — moved under Positional Top 300 */}
        <section className="mx-auto w-full max-w-5xl mt-12">
          <h2 className="text-2xl font-bold mb-4 text-center">Draft Results</h2>
          <div className="rounded-2xl border border-gray-800 bg-black/20 p-5">
            <p className="text-gray-300 mb-4">
              After the draft, results will show here. You can export a <strong>PDF</strong> or a{' '}
              <strong>CSV</strong> of the <em>Top 300</em> list or <em>Draft Grades</em>.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <div className="flex items-center gap-2">
                <label htmlFor="csv-target" className="text-sm text-gray-300">
                  CSV content:
                </label>
                <select
                  id="csv-target"
                  value={csvTarget}
                  onChange={(e) => setCsvTarget(e.target.value as 'top300' | 'grades')}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                >
                  <option value="top300">Top 300 Players</option>
                  <option value="grades">Draft Grades</option>
                </select>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded-xl font-semibold text-black bg-[#D9D7B6] hover:bg-[#cfcdb3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Draft Grades — moved under Draft Results */}
        <section className="mx-auto w-full max-w-6xl mt-12">
          <h2 className="text-2xl font-bold mb-4 text-center">Draft Grades</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_TEAMS.map((t) => (
              <GradeCard key={t} team={t} grade="—" notes="Grades coming soon." />
            ))}
          </div>
        </section>

        {/* PDF Embed — stays last */}
        <PdfSection
          title="Draft Planner"
          pdfPath={DRAFT_ORDER_PDF}
          downloadName="Download PDF"
          openLabel="Open in new tab"
        />
      </div>
    </div>
  );
}

function PdfSection({
  title,
  pdfPath,
  downloadName,
  openLabel,
}: {
  title: string;
  pdfPath: string;
  downloadName: string;
  openLabel: string;
}) {
  return (
        <section className="mx-auto w-full max-w-6xl mt-12 mb-16">
          <h2 className="text-2xl font-bold mb-4 text-center">{title}</h2>
          <div className="rounded-2xl border border-gray-800 bg-black/20 p-3">
            <iframe
              title={title}
              src={`${pdfPath}#view=FitH&toolbar=1&navpanes=0`}
              className="w-full h-[540px] md:h-[900px] rounded-lg"
            />
            <div className="flex justify-center gap-3 mt-3">
              <a
                href={pdfPath}
                download
                className="px-4 py-2 rounded-xl font-semibold text-black bg-[#D9D7B6] hover:bg-[#cfcdb3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                {downloadName}
              </a>
              <a
                href={pdfPath}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl font-semibold text-black bg-[#D9D7B6] hover:bg-[#cfcdb3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                {openLabel}
              </a>
            </div>
          </div>
        </section>
  );
}

/* ------------------------------- Components ------------------------------- */

function LeagueOrder({
  leagueKey,
  names,
}: {
  leagueKey: 'A' | 'B' | 'C';
  names: string[];
}) {
  return (
    <div className={[sectionAccentByKey(leagueKey), 'w-full max-w-xl'].join(' ')}>
      <div className="p-6">
        <h3 className={`text-lg font-semibold mb-4 text-center ${titleColorByKey(leagueKey)}`}>
          {`League ${leagueKey}`}
        </h3>
        <ul className="space-y-2">
          {names.map((name, idx) => (
            <li key={name + idx} className="flex justify-center">
              <span className="text-gray-400 tabular-nums w-6 text-right mr-3">{idx + 1}.</span>
              <span className="truncate">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PositionFilter({
  value,
  onChange,
}: {
  value: Pos | 'ALL';
  onChange: (v: Pos | 'ALL') => void;
}) {
  const opts: (Pos | 'ALL')[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'D/ST', 'K'];

  const BTN_MAP: Record<
    Exclude<Pos, never>,
    { text: string; filled: string }
  > = {
    QB:  { text: 'text-red-400',    filled: 'bg-red-600 hover:bg-red-500 border-red-500 text-white' },
    RB:  { text: 'text-green-400',  filled: 'bg-green-600 hover:bg-green-500 border-green-500 text-white' },
    WR:  { text: 'text-blue-400',   filled: 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white' },
    TE:  { text: 'text-orange-400', filled: 'bg-orange-600 hover:bg-orange-500 border-orange-500 text-white' },
    'D/ST': { text: 'text-purple-400', filled: 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white' },
    K:   { text: 'text-yellow-300', filled: 'bg-yellow-400 hover:bg-yellow-300 border-yellow-400 text-black' },
  };

  return (
    <div className="flex gap-1">
      {opts.map((opt) => {
        const base = 'px-3 py-2 rounded border text-sm transition';
        if (opt === 'ALL') {
          const selected = value === 'ALL';
          return (
            <button
              key="ALL"
              onClick={() => onChange('ALL')}
              className={[
                base,
                selected ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300',
              ].join(' ')}
              title="All positions"
            >
              ALL
            </button>
          );
        } else {
          const pos = opt as Pos;
          const selected = value === pos;
          const scheme = BTN_MAP[pos];
          return (
            <button
              key={pos}
              onClick={() => onChange(pos)}
              className={[
                base,
                selected ? scheme.filled : `bg-gray-800 border-gray-700 hover:bg-gray-700 ${scheme.text}`,
              ].join(' ')}
              title={pos}
            >
              {pos}
            </button>
          );
        }
      })}
    </div>
  );
}

function GradeCard({ team, grade, notes }: { team: string; grade: string; notes?: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-black/30 p-4 text-left">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold truncate">{team}</h3>
        <span className="text-xl font-bold text-orange-400">{grade}</span>
      </div>
      {notes && <p className="text-gray-400 text-sm mt-2">{notes}</p>}
    </div>
  );
}
