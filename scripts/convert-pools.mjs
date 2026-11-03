/**
 * Pool conversion (pool-files in docs/architecture.html): reads the curated
 * genre lists in docs/pool-sources/<genre>/<type>-<genre>.md and writes the 5
 * pool files public/pools/<type>.json that the app loads. The JSON it writes is
 * the source of truth at run time; the .md lists are where cues are edited.
 *
 * Re-runnable: the same lists always give the same JSON. After a list edit run
 * `node scripts/convert-pools.mjs` then `npx prettier --write public/pools`.
 *
 * Rules: a cue found in several folders (or listed under ## Classics) is stored
 * once, keyed by lowercase text, and gets every folder's genre. The first
 * occurrence (folder order, then file order) fixes its text, kind and position.
 * Exits 1 on a broken source line.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Genre folders in GENRES order, with each folder's file name suffix. */
const FOLDERS = [
  { genre: 'generic', suffix: 'generic' },
  { genre: 'sci-fi', suffix: 'scifi' },
  { genre: 'cyberpunk', suffix: 'cyberpunk' },
  { genre: 'space-opera', suffix: 'space-opera' },
];
const GENRE_ORDER = FOLDERS.map((folder) => folder.genre);

/** Card types with their file stem and id prefix. */
const TYPES = [
  { type: 'character', stem: 'characters', prefix: 'ch' },
  { type: 'motivation', stem: 'motivations', prefix: 'mo' },
  { type: 'setting', stem: 'settings', prefix: 'se' },
  { type: 'conflict', stem: 'conflicts', prefix: 'co' },
  { type: 'description', stem: 'descriptions', prefix: 'de' },
];

const KIND_PATTERN = /\s+\((place|event|object)\)$/;

/** Prints a broken-line message and stops the script. */
function fail(file, lineNumber, message) {
  process.stderr.write(`${file}:${lineNumber}: ${message}\n`);
  process.exit(1);
}

for (const { type, stem, prefix } of TYPES) {
  /** @type {Map<string, { text: string; kind?: string; genres: Set<string> }>} */
  const cues = new Map();

  for (const { genre, suffix } of FOLDERS) {
    const file = join('docs', 'pool-sources', genre, `${stem}-${suffix}.md`);
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((rawLine, index) => {
      const line = rawLine.trim();
      const lineNumber = index + 1;
      if (line === '' || /^#{1,2} /.test(line)) return;
      if (/^[#*-]/.test(line)) fail(file, lineNumber, `broken source line "${line}".`);

      let text = line;
      let kind;
      const match = KIND_PATTERN.exec(line);
      if (type === 'setting') {
        if (!match) fail(file, lineNumber, `setting "${line}" needs (place), (event) or (object).`);
        kind = match[1];
        text = line.slice(0, match.index).trim();
      } else if (match) {
        fail(file, lineNumber, `only settings take a kind: "${line}".`);
      }
      text = text.replace(/\s+/g, ' ');

      const key = text.toLowerCase();
      const existing = cues.get(key);
      if (existing) {
        existing.genres.add(genre);
        if (kind !== existing.kind) {
          process.stdout.write(
            `WARN ${type} "${existing.text}" is ${existing.kind} and ${kind}; keeping ${existing.kind}.\n`,
          );
        }
      } else {
        cues.set(key, { text, kind, genres: new Set([genre]) });
      }
    });
  }

  const pool = {
    type,
    cues: [...cues.values()].map((cue, index) => ({
      id: `${prefix}-${String(index + 1).padStart(4, '0')}`,
      text: cue.text,
      ...(cue.kind ? { kind: cue.kind } : {}),
      genres: GENRE_ORDER.filter((genre) => cue.genres.has(genre)),
    })),
  };
  writeFileSync(join('public', 'pools', `${type}.json`), `${JSON.stringify(pool, null, 2)}\n`);

  const perGenre = GENRE_ORDER.map(
    (genre) => `${genre} ${pool.cues.filter((cue) => cue.genres.includes(genre)).length}`,
  ).join(', ');
  process.stdout.write(`${type}: ${pool.cues.length} cues (${perGenre})\n`);
}
