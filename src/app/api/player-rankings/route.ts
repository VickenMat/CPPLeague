import { NextResponse } from 'next/server';
import { loadPlayerIndex, SOURCE } from '../../../../lib/player-values';

export async function GET() {
  try {
    const index = await loadPlayerIndex();
    const players = Array.from(index, ([id, row]) => ({
      id, name: row.name, position: row.position, nflTeam: row.team,
      value: row.value.trim() ? Number(row.value) : NaN,
    })).filter(player => player.name && Number.isFinite(player.value))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    return NextResponse.json({ players, source: SOURCE });
  } catch {
    return NextResponse.json({ error: 'Unable to load player rankings. Please try again.' }, { status: 500 });
  }
}
