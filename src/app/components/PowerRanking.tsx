'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  closestCenter,
  DragOverlay,
  useDndContext,
} from '@dnd-kit/core';

type LeagueKey = 'A' | 'B';
type Tier = 'Goat' | 'Valid' | 'Mid' | 'Washed' | 'Maybe Next Year';
const TIERS: Tier[] = ['Goat', 'Valid', 'Mid', 'Washed', 'Maybe Next Year'];

type ColumnId =
  | 'A:Unassigned' | 'A:Goat' | 'A:Valid' | 'A:Mid' | 'A:Washed' | 'A:Maybe Next Year'
  | 'B:Unassigned' | 'B:Goat' | 'B:Valid' | 'B:Mid' | 'B:Washed' | 'B:Maybe Next Year';

type ColumnsState = Record<ColumnId, string[]>;
type Team = { id: string; name: string; league: LeagueKey; active: boolean };

const STORAGE_KEY = 'powerRankingsV3';

/** Tier palette (for item soft bg + borders) */
const TIER_STYLES: Record<
  Tier,
  { bg: string; border: string; text: string; soft: string }
> = {
  Goat:             { bg: 'bg-amber-600',   border: 'border-amber-400',   text: 'text-amber-100',   soft: 'bg-amber-500/20' },
  Valid:            { bg: 'bg-emerald-600', border: 'border-emerald-400', text: 'text-emerald-100', soft: 'bg-emerald-500/20' },
  Mid:              { bg: 'bg-sky-600',     border: 'border-sky-400',     text: 'text-sky-100',     soft: 'bg-sky-500/20' },
  Washed:           { bg: 'bg-fuchsia-600', border: 'border-fuchsia-400', text: 'text-fuchsia-100', soft: 'bg-fuchsia-500/20' },
  'Maybe Next Year':{ bg: 'bg-gray-600',    border: 'border-gray-400',    text: 'text-gray-100',    soft: 'bg-gray-500/20' },
};

function leagueTintClass(l: LeagueKey | string | undefined) {
  if (!l) return '';
  if (String(l).toUpperCase().includes('A')) return 'text-red-400';
  if (String(l).toUpperCase().includes('B')) return 'text-blue-400';
  return '';
}

export default function PowerRankingBoard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // remote teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const teamById = useMemo(() => {
    const m = new Map<string, Team>();
    teams.forEach(t => m.set(t.id, t));
    return m;
  }, [teams]);

  const initialColumns: ColumnsState | null = useMemo(() => {
    if (teams.length === 0) return null;
    const aIds = teams.filter(t => t.league === 'A' && t.active).map(t => t.id);
    const bIds = teams.filter(t => t.league === 'B' && t.active).map(t => t.id);
    return {
      'A:Unassigned': aIds,
      'A:Goat': [], 'A:Valid': [], 'A:Mid': [], 'A:Washed': [], 'A:Maybe Next Year': [],
      'B:Unassigned': bIds,
      'B:Goat': [], 'B:Valid': [], 'B:Mid': [], 'B:Washed': [], 'B:Maybe Next Year': [],
    };
  }, [teams]);

  const [columns, setColumns] = useState<ColumnsState | null>(null);

  // search + random focus ring
  const [search, setSearch] = useState('');
  const [ringClass, setRingClass] = useState<string>('');
  const randomRing = () => {
    const choices = ['ring-red-400', 'ring-blue-400', 'ring-orange-400'];
    return choices[Math.floor(Math.random() * choices.length)];
  };

  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoadingTeams(true);
      setLoadErr(null);
      try {
        const res = await fetch('/api/teams', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load teams');
        const data = (await res.json()) as Team[];
        if (!ignore) setTeams(data);
      } catch (e: any) {
        if (!ignore) setLoadErr(e?.message ?? 'Unknown error');
      } finally {
        if (!ignore) setLoadingTeams(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!initialColumns) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ColumnsState;
        const validIds = new Set(teams.map(t => t.id));
        const sanitized = Object.fromEntries(
          Object.entries(parsed).map(([k, arr]) => [k, (arr as string[]).filter(id => validIds.has(id))])
        ) as ColumnsState;
        setColumns(sanitized);
        return;
      } catch {/* ignore */}
    }
    setColumns(initialColumns);
  }, [initialColumns, teams]);

  useEffect(() => {
    if (columns) localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  const handleDragStart = (event: any) => setActiveId(event.active.id);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !columns) return;

    const from = (Object.keys(columns) as ColumnId[]).find(k => columns[k].includes(active.id));
    const to = over.id as ColumnId;
    if (!from || !to || from === to) return;

    const team = teamById.get(active.id as string);
    if (!team) return;
    const targetLeague: LeagueKey = to.startsWith('A:') ? 'A' : 'B';
    if (team.league !== targetLeague) return;

    setColumns(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      next[from] = next[from].filter(id => id !== team.id);
      next[to] = [...next[to], team.id];
      return next;
    });
  };

  const resetBoard = () => {
    if (!initialColumns) return;
    localStorage.removeItem(STORAGE_KEY);
    setColumns(initialColumns);
  };

  const saveBoard = async () => {
    if (!columns) return;
    const user = 'anon-user';

    const items: Array<{ teamId: string; tier: Tier }> = [];
    for (const [bucket, arr] of Object.entries(columns) as [ColumnId, string[]][]) {
      if (/unassigned/i.test(bucket)) continue;
      if (!arr?.length) continue;
      const [, tier] = bucket.split(':', 2);
      if (!tier) continue;
      for (const teamId of arr) items.push({ teamId, tier: tier as Tier });
    }

    if (items.length === 0) {
      alert('Nothing to save. Drag teams into tiers first.');
      return;
    }

    try {
      const res = await fetch('/api/save-power-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, items }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error(data);
        alert('❌ Failed to save');
        return;
      }
      alert('✅ Power Rankings saved!');
    } catch (err) {
      console.error(err);
      alert('❌ Failed to connect to server.');
    }
  };

  const filterIdsBySearch = (ids: string[]) =>
    search
      ? ids.filter(id => teamById.get(id)?.name.toLowerCase().includes(search.toLowerCase()))
      : ids;

  if (!mounted) return null;

  if (loadingTeams || !columns) {
    return (
      <div className="p-6 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Power Rankings</h2>
        <div className="text-gray-400">Loading roster…</div>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="p-6 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Power Rankings</h2>
        <div className="text-red-300">Failed to load teams: {loadErr}</div>
      </div>
    );
  }

  return (
    <div className="p-6 text-center text-white">
      <p className="mb-5 text-gray-300">Drag teams from each league’s Unassigned box into tiers.</p>

      <div className="mb-6 flex justify-center gap-3">
        <input
          type="text"
          placeholder="Search teams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setRingClass(randomRing())}
          onBlur={() => setRingClass('')}
          className={`px-3 py-2 rounded bg-gray-800 border border-gray-600 outline-none focus:ring-2 w-64 text-white ${ringClass}`}
        />
        <button
          onClick={saveBoard}
          className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-semibold shadow-sm transition"
        >
          Save
        </button>
        <button
          onClick={resetBoard}
          className="px-4 py-2 bg-gray-700 rounded text-white"
        >
          Reset
        </button>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* ===== Unassigned — League A (FULL WIDTH) ===== */}
        <section className="mx-auto w-full max-w-5xl">
          <DroppableColumn
            id="A:Unassigned"
            title="Unassigned — League A"
            teamIds={filterIdsBySearch(columns['A:Unassigned'])}
            resolveName={(id) => teamById.get(id)?.name ?? id}
            accept="A"
            wide
            getLeagueById={(id) => teamById.get(id)?.league ?? null}
          />
        </section>

        {/* ===== League A tiers ===== */}
        <section className="mt-8 mx-auto w-full max-w-6xl text-left">
          <h3 className={`text-xl font-semibold mb-3 text-center ${leagueTintClass('A')}`}>League A</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {TIERS.map((tier) => (
              <DroppableColumn
                key={`A:${tier}`}
                id={`A:${tier}`}
                title={tier}
                teamIds={filterIdsBySearch(columns[`A:${tier}` as ColumnId])}
                resolveName={(id) => teamById.get(id)?.name ?? id}
                accept="A"
                getLeagueById={(id) => teamById.get(id)?.league ?? null}
              />
            ))}
          </div>
        </section>

        {/* ===== Unassigned — League B (FULL WIDTH) ===== */}
        <section className="mt-10 mx-auto w-full max-w-5xl">
          <DroppableColumn
            id="B:Unassigned"
            title="Unassigned — League B"
            teamIds={filterIdsBySearch(columns['B:Unassigned'])}
            resolveName={(id) => teamById.get(id)?.name ?? id}
            accept="B"
            wide
            getLeagueById={(id) => teamById.get(id)?.league ?? null}
          />
        </section>

        {/* ===== League B tiers ===== */}
        <section className="mt-8 mx-auto w-full max-w-6xl text-left">
          <h3 className={`text-xl font-semibold mb-3 text-center ${leagueTintClass('B')}`}>League B</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {TIERS.map((tier) => (
              <DroppableColumn
                key={`B:${tier}`}
                id={`B:${tier}`}
                title={tier}
                teamIds={filterIdsBySearch(columns[`B:${tier}` as ColumnId])}
                resolveName={(id) => teamById.get(id)?.name ?? id}
                accept="B"
                getLeagueById={(id) => teamById.get(id)?.league ?? null}
              />
            ))}
          </div>
        </section>

        <DragOverlay>
          {activeId && (
            <div className="px-4 py-2 rounded bg-gray-700 border border-purple-400">
              {teamById.get(activeId)?.name ?? activeId}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/** Parse "A:Goat" -> "Goat", ignore "A:Unassigned" */
function parseTierFromColumn(id: ColumnId): Tier | null {
  const [, raw] = id.split(':', 2);
  if (!raw || raw.toLowerCase() === 'unassigned') return null;
  if (['Goat','Valid','Mid','Washed','Maybe Next Year'].includes(raw)) {
    return raw as Tier;
  }
  return null;
}

function DroppableColumn({
  id,
  title,
  teamIds,
  resolveName,
  accept,            // 'A' | 'B'
  getLeagueById,
  wide,
}: {
  id: ColumnId;
  title: string;
  teamIds: string[];
  resolveName: (id: string) => string;
  accept: LeagueKey;
  getLeagueById: (id: string) => LeagueKey | null;
  wide?: boolean;
}) {
  const { active } = useDndContext();
  const activeId = active?.id as string | undefined;
  const draggingLeague = activeId ? getLeagueById(activeId) : null;

  const disabled = draggingLeague !== null && draggingLeague !== accept;
  const { setNodeRef, isOver } = useDroppable({ id, disabled });

  const tier = parseTierFromColumn(id);
  const tierStyle = tier ? TIER_STYLES[tier] : null;

  const widthClasses = wide ? 'w-full' : '';
  const titleColor =
    tier ? 'text-white' : leagueTintClass(title.includes('League A') ? 'A' : (title.includes('League B') ? 'B' : ''));

  return (
    <div
      ref={setNodeRef}
      className={[
        'p-4 rounded-lg border-2 bg-gray-900 transition-colors',
        widthClasses,
        disabled
          ? 'opacity-60 cursor-not-allowed border-dashed border-gray-700'
          : isOver
            ? (tierStyle ? tierStyle.border : 'border-purple-400')
            : 'border-transparent',
        tierStyle ? `ring-1 ring-inset ${tierStyle.border}` : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-semibold ${titleColor}`}>{title}</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {teamIds.map((idVal) => (
          <DraggableItem
            key={idVal}
            id={idVal}
            label={resolveName(idVal)}
            colorSoft={tierStyle?.soft}
            colorBorder={tierStyle?.border}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableItem({
  id,
  label,
  colorSoft,
  colorBorder,
}: {
  id: string;
  label: string;
  colorSoft?: string;
  colorBorder?: string;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={[
        'inline-block px-3 py-1.5 rounded border text-sm cursor-grab transition',
        colorSoft ?? 'bg-gray-800',
        colorBorder ?? 'border-gray-700',
        'hover:bg-gray-700',
      ].join(' ')}
    >
      {label}
    </div>
  );
}
