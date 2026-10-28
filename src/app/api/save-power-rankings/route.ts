import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// Allowed new tiers
const VALID_TIERS = new Set(['Goat','Valid','Mid','Washed','Maybe Next Year']);

// Parse the "old shape" { "A:Goat": ["Team1","Team2"], ... } into [{teamId,tier}]
async function parseLegacyColumnsToItems(columns: Record<string, string[]>) {
  // fetch teams once
  const { data: teams, error } = await supabase
    .from('teams')
    .select('id, name, league, active')
    .eq('active', true);
  if (error) throw new Error(error.message);
  const byName = new Map(teams.map(t => [t.name.trim(), t]));

  const items: Array<{ teamId: string; tier: string }> = [];

  for (const [bucket, arr] of Object.entries(columns)) {
    if (!Array.isArray(arr) || arr.length === 0) continue;
    if (/unassigned/i.test(bucket)) continue; // ignore unassigned
    const tier = bucket.includes(':') ? bucket.split(':', 2)[1] : bucket; // "A:Goat" -> "Goat"
    if (!VALID_TIERS.has(tier)) continue;

    for (const teamName of arr) {
      const t = byName.get(String(teamName).trim());
      if (!t) continue; // unknown team name
      // Optional: enforce league match between bucket prefix and team.league
      if (bucket.includes(':')) {
        const prefix = bucket.split(':', 2)[0] as 'A'|'B';
        if (prefix !== t.league) continue;
      }
      items.push({ teamId: t.id, tier });
    }
  }
  return items;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = String(body?.user || '').trim();

    if (!user) {
      return NextResponse.json({ error: 'Missing user' }, { status: 400 });
    }

    let items: Array<{ teamId: string; tier: string }> = [];

    // New shape preferred: { items: [{teamId, tier}, ...] }
    if (Array.isArray(body?.items)) {
      for (const it of body.items) {
        const tier = String(it?.tier || '');
        const teamId = String(it?.teamId || '');
        if (!teamId || !VALID_TIERS.has(tier)) continue;
        items.push({ teamId, tier });
      }
    }
    // Legacy shape: { rankings: { 'A:Goat': ['Name',...], ... } }
    else if (body?.rankings && typeof body.rankings === 'object') {
      items = await parseLegacyColumnsToItems(body.rankings);
    }

    // Filter nothing = error
    if (items.length === 0) {
      return NextResponse.json({ error: 'No valid assigned items' }, { status: 400 });
    }

    // 1) Upsert (or create) a ballot for this user (no season/week yet)
    // Try to find an existing one; otherwise create one.
    let ballotId: string | null = null;
    {
      const { data, error } = await supabase
        .from('ballots')
        .select('id')
        .eq('user_id', user)
        .limit(1)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (maybeSingle)
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (data?.id) {
        ballotId = data.id;
        // touch updated_at
        await supabase.from('ballots').update({ updated_at: new Date().toISOString() }).eq('id', ballotId);
      } else {
        const { data: ins, error: insErr } = await supabase
          .from('ballots')
          .insert({ user_id: user })
          .select('id')
          .single();
        if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
        ballotId = ins.id;
      }
    }

    // 2) Replace this ballot's items with the new assigned list
    // Delete existing
    const { error: delErr } = await supabase.from('ballot_items').delete().eq('ballot_id', ballotId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // Insert new
    const rows = items.map(it => ({
      ballot_id: ballotId!,
      team_id: it.teamId,
      tier: it.tier,
      created_at: new Date().toISOString(),
    }));
    const { error: insErr } = await supabase.from('ballot_items').insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ success: true, inserted: rows.length, ballotId });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
