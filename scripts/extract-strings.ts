/**
 * Collects every English string that can appear in the UI, so it can be translated in src/game/ar.json.
 * Usage: npx vite-node scripts/extract-strings.ts
 * Writes scripts/strings-missing.json (strings with no Arabic yet).
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MISSIONS } from '../src/content/missions';
import { PUZZLE_BINS, PUZZLE_CLUES } from '../src/content/puzzle';
import { SOURCES } from '../src/content/sources';

const found = new Set<string>();

function walk(v: unknown) {
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) return v.forEach(walk);
  const o = v as Record<string, unknown>;
  if (typeof o.en === 'string') found.add(o.en);
  for (const k of Object.keys(o)) walk(o[k]);
}
walk(MISSIONS);
walk(PUZZLE_BINS);
walk(PUZZLE_CLUES);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
}
const patterns = [/\bt\(\s*'((?:[^'\\]|\\.)+)'/g, /\bt\(\s*"((?:[^"\\]|\\.)+)"/g, /\ben:\s*'((?:[^'\\]|\\.)+)'/g, /\ben:\s*"((?:[^"\\]|\\.)+)"/g, /\bL\(\s*'((?:[^'\\]|\\.)+)'/g, /\bL\(\s*"((?:[^"\\]|\\.)+)"/g, /\bdesc:\s*'((?:[^'\\]|\\.)+)'/g];
for (const f of files('src')) {
  const src = readFileSync(f, 'utf8');
  for (const re of patterns) for (const m of src.matchAll(re)) found.add(m[1].replace(/\\'/g, "'").replace(/\\"/g, '"'));
}
// Source titles appear on the credits screen.
for (const s of SOURCES) found.add(s.title);

const ar = JSON.parse(readFileSync('src/game/ar.json', 'utf8')) as Record<string, string>;
const all = [...found].filter((s) => s.trim() && !/^[\d\s.,%$+\-–—:/()]+$/.test(s)).sort();
const missing = all.filter((s) => !ar[s]);
writeFileSync('scripts/strings-missing.json', JSON.stringify(missing, null, 2));
console.log(`strings: ${all.length}, translated: ${all.length - missing.length}, missing: ${missing.length}`);
