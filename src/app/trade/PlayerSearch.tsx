'use client';

import { useId, useState } from 'react';
import { positionTextClass } from '../lib/position-colors';

export type RankedPlayer = {
  id: number;
  name: string;
  position: string;
  nflTeam: string;
  value: number;
};

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export default function PlayerSearch({ label, players, selected, excludedIds, disabled, onAdd, onRemove, onClear }: {
  label: string;
  players: RankedPlayer[];
  selected: RankedPlayer[];
  excludedIds: Set<number>;
  disabled: boolean;
  onAdd: (player: RankedPlayer) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const needle = normalize(query);
  const matches = needle ? players.filter(player => !excludedIds.has(player.id) && normalize(player.name).includes(needle)).slice(0, 8) : [];
  const expanded = open && !!needle && !disabled;
  const active = Math.min(highlight, Math.max(0, matches.length - 1));

  function choose(player: RankedPlayer) {
    onAdd(player);
    setQuery(''); setHighlight(0); setOpen(false);
  }

  return (
    <div className="min-w-0 rounded-2xl border border-gray-800 bg-black/30 p-4">
      <div className="relative mb-2 flex min-h-7 items-center justify-center px-14">
        <label htmlFor={id} className="text-center text-sm font-semibold">{label}</label>
        <button type="button" aria-label={`Clear ${label}`} onClick={() => { onClear(); setQuery(''); setOpen(false); setHighlight(0); }}
          className="absolute right-0 rounded border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white">Clear</button>
      </div>
      <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
        <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={expanded}
          aria-controls={`${id}-results`} aria-activedescendant={expanded && matches.length ? `${id}-${active}` : undefined}
          autoComplete="off" placeholder="Type a player name…" disabled={disabled} value={query}
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setHighlight(0); setOpen(true); }}
          onKeyDown={e => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault(); setOpen(true);
              setHighlight(Math.max(0, Math.min(matches.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1))));
            }
            if (e.key === 'Enter' && expanded && matches[active]) { e.preventDefault(); choose(matches[active]); }
          }}
          className="cpp-player-search-input w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-white outline-none disabled:opacity-50" />
        <ul id={`${id}-results`} role="listbox" aria-label={`${label} player suggestions`} hidden={!expanded}
          className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-950 shadow-xl">
          {matches.map((player, index) => <li key={player.id} id={`${id}-${index}`} role="option" aria-selected={active === index}
            onMouseDown={e => e.preventDefault()} onMouseEnter={() => setHighlight(index)} onClick={() => choose(player)}
            className={`cursor-pointer px-3 py-2 ${active === index ? 'bg-[#A4D65E] text-[#005030]' : 'hover:bg-white/10'}`}>
            <div className="flex items-center justify-between gap-2 text-sm"><span>{player.name}</span><span className="font-mono">{player.value.toLocaleString()}</span></div>
            <div className="text-xs text-gray-400"><span className={positionTextClass(player.position)}>{player.position}</span> · {player.nflTeam}</div>
          </li>)}
        </ul>
        {expanded && !matches.length && <p role="status" className="mt-2 text-sm text-gray-400">No matching players available.</p>}
      </div>
      <ul className="mt-3 space-y-2" aria-label={`${label} selected players`}>
        {selected.map(player => <li key={player.id} className="flex items-center gap-3 rounded-lg border border-gray-800 p-2 text-sm">
          <div className="min-w-0 flex-1"><div>{player.name}</div><div className="text-xs text-gray-400"><span className={positionTextClass(player.position)}>{player.position}</span> · {player.nflTeam}</div></div>
          <span className="font-mono">{player.value.toLocaleString()}</span>
          <button type="button" aria-label={`Remove ${player.name} from ${label}`} onClick={() => onRemove(player.id)} className="rounded px-2 py-1 text-gray-400 hover:bg-white/10 hover:text-white">×</button>
        </li>)}
      </ul>
    </div>
  );
}
