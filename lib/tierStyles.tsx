// src/lib/tierStyles.ts

// 1) Canonical Tier type (import this everywhere)
export type Tier = 'Goat' | 'Valid' | 'Mid' | 'Washed' | 'Maybe Next Year';

// 2) Tailwind class map for each tier (use in board + homepage)
export const TIER_STYLES: Record<
  Tier,
  { bg: string; border: string; text: string; soft: string }
> = {
  Goat:             { bg: 'bg-amber-600',   border: 'border-amber-400',   text: 'text-amber-100',   soft: 'bg-amber-500/20' },
  Valid:            { bg: 'bg-emerald-600', border: 'border-emerald-400', text: 'text-emerald-100', soft: 'bg-emerald-500/20' },
  Mid:              { bg: 'bg-sky-600',     border: 'border-sky-400',     text: 'text-sky-100',     soft: 'bg-sky-500/20' },
  Washed:           { bg: 'bg-fuchsia-600', border: 'border-fuchsia-400', text: 'text-fuchsia-100', soft: 'bg-fuchsia-500/20' },
  'Maybe Next Year':{ bg: 'bg-gray-600',    border: 'border-gray-400',    text: 'text-gray-100',    soft: 'bg-gray-500/20' },
};

// 3) Convenience badge component (optional, handy on homepage lists)
export function TierBadge({ tier }: { tier: Tier }) {
  const s = TIER_STYLES[tier];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${s.bg} ${s.text} border ${s.border}`}>
      {tier}
    </span>
  );
}
