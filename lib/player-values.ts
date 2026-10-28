import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

type CsvRow = Record<string, string>;

export const VALUES_FILE = 'fantasycalc_redraftrankings_2026.csv';
export const SOURCE = 'fantasycalc_redraftrankings_2026_csv';
let cachedIndex: Map<number, CsvRow> | null = null;

/** Index the rankings export by ESPN player ID. */
export async function loadPlayerIndex(): Promise<Map<number, CsvRow>> {
  if (cachedIndex) return cachedIndex;

  const text = await fs.readFile(path.join(process.cwd(), 'public', VALUES_FILE), 'utf8');
  const rows: CsvRow[] = parse(text, {
    bom: true, columns: true, trim: true, skip_empty_lines: true,
  });
  if (!rows.length || !['espnId', 'value'].every((key) => key in rows[0])) {
    throw new Error(`Missing player value columns in ${VALUES_FILE}`);
  }

  const index = new Map<number, CsvRow>();
  for (const row of rows) {
    const id = Number(row.espnId);
    if (row.espnId && Number.isInteger(id) && id > 0) {
      index.set(id, row);
    }
  }
  cachedIndex = index;
  return index;
}

