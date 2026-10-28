'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import draft2025 from '../../../public/draft_2025_teams.json';
import keepers2026 from '../../../public/keepers_2026.json';

type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'D/ST' | 'K';

type DraftPickRecord = {
  name: string;
  team: string;
  position: string;
  round: number;
  pick: number;
  drafted_by?: string;
};

type DraftPick = {
  name: string;
  team: string;
  position: Pos;
  round: number;
  pick: number;
  draftedBy: string;
};

type KeeperSelection = {
  teamName: string;
  playerName: string | null;
  nflTeam?: string | null;
  position?: Pos | null;
  acquisitionMethod?: string | null;
  draftedRound?: number | null;
  draftedPick?: number | null;
};

const POS_COLOR_TEXT: Record<Pos, string> = {
  QB: 'text-red-400',
  RB: 'text-green-400',
  WR: 'text-blue-400',
  TE: 'text-orange-400',
  'D/ST': 'text-purple-400',
  K: 'text-yellow-300',
};

function normalizePos(pos: string): Pos | null {
  const value = pos.trim().toUpperCase();
  if (value === 'QB' || value === 'RB' || value === 'WR' || value === 'TE' || value === 'D/ST' || value === 'K') {
    return value;
  }
  if (value === 'DST' || value === 'DEF') {
    return 'D/ST';
  }
  return null;
}

function formatRound(round: number) {
  if (round % 100 >= 11 && round % 100 <= 13) return `${round}th`;
  if (round % 10 === 1) return `${round}st`;
  if (round % 10 === 2) return `${round}nd`;
  if (round % 10 === 3) return `${round}rd`;
  return `${round}th`;
}

function keeperCostRound(draftedRound: number) {
  return Math.max(1, draftedRound - 1);
}

function waiverKeeperCostRound() {
  return 10;
}

function accentWrap(color: 'red' | 'blue') {
  const ring =
    color === 'red'
      ? 'ring-red-600/70 before:bg-red-600'
      : 'ring-blue-600/70 before:bg-blue-600';

  return [
    'relative rounded-2xl bg-black/20 shadow-lg',
    'border border-gray-800/60 ring-1',
    'before:absolute before:left-0 before:top-0 before:h-1.5 before:w-full before:rounded-t-2xl before:content-[""]',
    ring,
  ].join(' ');
}

export default function KeeperPage() {
  const [query, setQuery] = useState('');

  const draftPicks = useMemo<DraftPick[]>(() => {
    return (draft2025 as DraftPickRecord[])
      .map((pick) => {
        const position = normalizePos(String(pick.position ?? ''));
        if (!position) return null;

        return {
          name: String(pick.name ?? '').trim(),
          team: String(pick.team ?? '').trim().toUpperCase(),
          position,
          round: Number(pick.round),
          pick: Number(pick.pick),
          draftedBy: String(pick.drafted_by ?? '').trim(),
        };
      })
      .filter((pick): pick is DraftPick => Boolean(pick?.name && pick.team && pick.round > 0 && pick.pick > 0 && pick.draftedBy))
      .sort((a, b) => (a.round - b.round) || (a.pick - b.pick));
  }, []);

  const filteredPicks = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return draftPicks;

    return draftPicks.filter((pick) => {
      return (
        pick.name.toLowerCase().includes(term) ||
        pick.team.toLowerCase().includes(term) ||
        pick.position.toLowerCase().includes(term) ||
        pick.draftedBy.toLowerCase().includes(term)
      );
    });
  }, [draftPicks, query]);

  const rounds = useMemo(() => {
    const grouped = filteredPicks.reduce<Record<number, DraftPick[]>>((acc, pick) => {
      if (!acc[pick.round]) acc[pick.round] = [];
      acc[pick.round].push(pick);
      return acc;
    }, {});

    return Object.keys(grouped)
      .map((round) => Number(round))
      .sort((a, b) => a - b)
      .map((round) => ({ round, picks: grouped[round] }));
  }, [filteredPicks]);

  const keepers = useMemo(() => {
    return (keepers2026 as KeeperSelection[]).map((selection) => {
      const normalizedPlayerName = (selection.playerName ?? '').trim();
      const drafted = normalizedPlayerName
        ? draftPicks.find((pick) => pick.name.toLowerCase() === normalizedPlayerName.toLowerCase())
        : null;
      const acquiredByWaiver = selection.acquisitionMethod?.toLowerCase() === 'waiver';
      const acquiredByDraft =
        selection.acquisitionMethod?.toLowerCase() === 'draft' ||
        (!acquiredByWaiver && Boolean(normalizedPlayerName));
      const sourceDraftedRound = drafted?.round ?? selection.draftedRound ?? null;
      const sourceDraftedPick = drafted?.pick ?? selection.draftedPick ?? null;
      const costRound = !normalizedPlayerName
        ? null
        : acquiredByWaiver
        ? waiverKeeperCostRound()
        : sourceDraftedRound
        ? keeperCostRound(sourceDraftedRound)
        : null;

      return {
        teamName: selection.teamName,
        playerName: selection.playerName,
        nflTeam: drafted?.team ?? selection.nflTeam ?? null,
        position: drafted?.position ?? selection.position ?? null,
        drafted,
        acquiredByWaiver,
        acquiredByDraft,
        draftedRound: sourceDraftedRound,
        draftedPick: sourceDraftedPick,
        costRound,
      };
    });
  }, [draftPicks]);

  return (
    <div className="relative min-h-screen text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_40%,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.85)_100%)]" />
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-contain bg-fixed opacity-8"
          style={{ backgroundImage: "url('/logo_transparent.png')" }}
        />
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-8 pb-20 text-center">
        <header className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">Keeper Central</h1>
          <p className="mt-3 text-gray-300 max-w-3xl mx-auto text-sm sm:text-base whitespace-normal sm:whitespace-nowrap">
            Keep a drafted player and you forfeit the pick one round earlier than where he was drafted the previous season.
          </p>
          <div className="mt-5 flex justify-center">
            <Link
              href="/rules"
              className="inline-flex items-center rounded-2xl bg-[#D9D7B6] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#cfcdb3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              Keeper Rules
            </Link>
          </div>
        </header>

        <section className="mt-10">
          <div className={accentWrap('red')}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-center">2026 Keepers</h2>
              <p className="mt-1 text-xs text-gray-500 text-center">
                Drafted players cost original round minus one. Waiver claims cost a 10th-round pick in year one.
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-sm text-center">
                  <thead className="text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-3 font-medium">Team</th>
                      <th className="py-3 px-3 font-medium">Keeper</th>
                      <th className="py-3 px-3 font-medium">NFL</th>
                      <th className="py-3 px-3 font-medium">POS</th>
                      <th className="py-3 px-3 font-medium">Acquisition Method</th>
                      <th className="py-3 px-3 font-medium">2026 Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keepers.map((keeper) => (
                      <tr key={`${keeper.teamName}-${keeper.playerName ?? 'empty'}`} className="border-b border-gray-900/80 last:border-b-0">
                        <td className="py-3 px-3 font-medium">{keeper.teamName}</td>
                        <td className="py-3 px-3">{keeper.playerName ?? 'Not selected'}</td>
                        <td className="py-3 px-3 text-gray-300">{keeper.nflTeam ?? '—'}</td>
                        <td className="py-3 px-3">
                          {keeper.position ? (
                            <span className="text-xs font-semibold text-gray-200">{keeper.position}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {!keeper.playerName ? (
                            <span className="text-gray-400">Not selected</span>
                          ) : keeper.acquiredByWaiver ? (
                            <span className="font-semibold text-yellow-300">Waiver Claim</span>
                          ) : (
                            `${formatRound(keeper.draftedRound!)} round, Pick ${keeper.draftedPick!}`
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {keeper.costRound ? `${formatRound(keeper.costRound)} round pick` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className={accentWrap('blue')}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-center">2025 Draft</h2>

              <div className="mt-5 flex justify-center">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by player, NFL team, fantasy team, or position"
                  className="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900/80 px-4 py-3 text-center text-white placeholder:text-gray-500 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </div>

              <div className="mt-8 space-y-8">
                {rounds.map(({ round, picks }) => (
                  <section key={round} className="border-t border-gray-800/80 pt-8 first:border-t-0 first:pt-0">
                    <h3 className="text-xl font-bold text-center">{formatRound(round)} Round</h3>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm text-center">
                        <thead className="text-gray-400 border-b border-gray-800">
                          <tr>
                            <th className="py-3 px-3 font-medium">Pick</th>
                            <th className="py-3 px-3 font-medium">Player</th>
                            <th className="py-3 px-3 font-medium">NFL Team</th>
                            <th className="py-3 px-3 font-medium">Drafting Team</th>
                            <th className="py-3 px-3 font-medium">Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {picks.map((pick) => (
                            <tr key={`${pick.round}-${pick.pick}-${pick.name}`} className="border-b border-gray-900/80 last:border-b-0">
                              <td className="py-3 px-3">{pick.pick}</td>
                              <td className="py-3 px-3 font-medium">{pick.name}</td>
                              <td className="py-3 px-3 text-gray-300">{pick.team}</td>
                              <td className="py-3 px-3 text-gray-300">{pick.draftedBy}</td>
                              <td className="py-3 px-3">
                                <span className={`text-xs font-semibold ${POS_COLOR_TEXT[pick.position]}`}>{pick.position}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>

              {!rounds.length && (
                <div className="mt-8 rounded-2xl border border-gray-800 bg-black/20 p-6 text-center text-gray-300">
                  No draft picks matched your search.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
