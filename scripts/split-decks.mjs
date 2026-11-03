/**
 * The one-time pool split (pool-files in docs/architecture.html): turns
 * docs/libraries/decks.json into the 11 pool files in public/pools/. Cue text is copied
 * unchanged except by 2 rules: the Constraint lead word is lowercased and a leading
 * "the", "a" or "an" is dropped from a Setting cue. Genres become kebab-case values,
 * Modifier targets become role / resource / setting, games are dropped, ids are stable
 * (<type>-0001 in file order) and the floors are checked: 10 cues per genre in each
 * genre-tagged deck, 20 cues per Modifier deck.
 *
 * The split runs once. After it, the JSON files are the source: the CLI refuses to run
 * when any pool file already exists.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** decks.json deck name → pool type, in decks.json order. */
export const DECK_FILES = {
  'Player Role': 'role',
  Mechanic: 'mechanic',
  Goal: 'goal',
  Conflict: 'conflict',
  Resource: 'resource',
  Setting: 'setting',
  Mood: 'mood',
  Modifier: 'modifier',
  Twist: 'twist',
  Progression: 'progression',
  Constraint: 'constraint',
};

const TAGGED = ['mechanic', 'resource', 'progression', 'constraint'];
const TARGETS = { 'Player Role': 'role', Resource: 'resource', Setting: 'setting' };
const TARGET_ORDER = ['role', 'resource', 'setting'];
const GENRE_FLOOR = 10;
const MODIFIER_FLOOR = 20;

/**
 * A genre name as the model stores it: lowercased, "&" dropped and every run of other
 * characters made one "-" ("Builder & Management" is builder-management).
 * @param {string} name
 * @returns {string}
 */
export function genreValue(name) {
  return name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The cue text after the 2 split rules.
 * @param {string} type
 * @param {string} card
 * @returns {string}
 */
function cueText(type, card) {
  if (type === 'constraint') return card.replace(/^\S+/, (word) => word.toLowerCase());
  if (type === 'setting') return card.replace(/^(the|a|an) /i, '');
  return card;
}

/**
 * Splits the decks into the 11 pools. Pure: no file access. Throws an Error with a
 * readable message on any broken rule.
 * @param {Record<string, Array<{ card: string, games?: string[], genres?: string[], targets?: string[] }>>} decks
 * @param {Record<string, unknown>} genres
 * @returns {{ pools: Record<string, { type: string, cues: Array<{ id: string, text: string, genres?: string[], targets?: string[] }> }>, report: string[] }}
 */
export function splitDecks(decks, genres) {
  for (const name of Object.keys(decks)) {
    if (!(name in DECK_FILES)) throw new Error(`Unknown deck ${name}`);
  }
  for (const name of Object.keys(DECK_FILES)) {
    if (!(name in decks)) throw new Error(`Missing deck ${name}`);
  }
  const genreNames = Object.keys(genres);
  const genreValues = genreNames.map(genreValue);
  /** @type {Record<string, { type: string, cues: Array<{ id: string, text: string, genres?: string[], targets?: string[] }> }>} */
  const pools = {};
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const report = [];

  for (const [name, type] of Object.entries(DECK_FILES)) {
    const seen = new Set();
    /** @type {Array<{ id: string, text: string, genres?: string[], targets?: string[] }>} */
    const cues = [];
    for (const entry of decks[name] ?? []) {
      const raw = typeof entry.card === 'string' ? entry.card : '';
      if (raw.trim() === '') throw new Error(`An empty card in the ${name} deck.`);
      const text = cueText(type, raw);
      /** @type {{ id: string, text: string, genres?: string[], targets?: string[] }} */
      const cue = { id: '', text };

      if (TAGGED.includes(type)) {
        if (!Array.isArray(entry.genres) || entry.genres.length === 0) {
          throw new Error(`The ${type} cue "${text}" needs a list of genres.`);
        }
        for (const genre of entry.genres) {
          if (!genreNames.includes(genre)) {
            throw new Error(`Unknown genre ${genre} on ${type} cue ${text}`);
          }
        }
        const values = new Set(entry.genres.map(genreValue));
        cue.genres = genreValues.filter((value) => values.has(value));
      } else if ('genres' in entry) {
        throw new Error(`The ${type} cue "${text}" has genres; only genre-tagged decks may.`);
      }

      if (type === 'modifier') {
        if (!Array.isArray(entry.targets) || entry.targets.length === 0) {
          throw new Error(`The modifier cue "${text}" needs a list of targets.`);
        }
        for (const target of entry.targets) {
          if (!(target in TARGETS)) {
            throw new Error(`Unknown target ${target} on modifier cue ${text}`);
          }
        }
        const values = new Set(
          entry.targets.map((target) => TARGETS[/** @type {keyof typeof TARGETS} */ (target)]),
        );
        cue.targets = TARGET_ORDER.filter((value) => values.has(value));
      } else if ('targets' in entry) {
        throw new Error(`The ${type} cue "${text}" has targets; only Modifier cues may.`);
      }

      const key = text.toLowerCase();
      if (seen.has(key)) {
        warnings.push(`WARN ${type}: "${text}" repeats an earlier cue and was dropped.`);
        continue;
      }
      seen.add(key);
      cues.push(cue);
    }
    cues.forEach((cue, i) => {
      cue.id = `${type}-${String(i + 1).padStart(4, '0')}`;
    });
    pools[type] = { type, cues };
    report.push(`${type}: ${cues.length} cues`);

    if (TAGGED.includes(type)) {
      for (let g = 0; g < genreValues.length; g++) {
        const value = genreValues[g];
        const count = cues.filter((cue) => cue.genres?.includes(value)).length;
        if (count < GENRE_FLOOR) {
          throw new Error(
            `The ${type} deck has ${count} cues in genre ${genreNames[g]}; the floor is ${GENRE_FLOOR}.`,
          );
        }
        report.push(`  ${value}: ${count}`);
      }
    }
    if (type === 'modifier') {
      for (const target of TARGET_ORDER) {
        const count = cues.filter((cue) => cue.targets?.includes(target)).length;
        if (count < MODIFIER_FLOOR) {
          throw new Error(
            `The modifier deck has ${count} cues for target ${target}; the floor is ${MODIFIER_FLOOR}.`,
          );
        }
        report.push(`  ${target}: ${count}`);
      }
    }
  }
  return { pools, report: [...report, ...warnings] };
}

/** The CLI: reads the libraries, refuses to overwrite, writes the 11 files. */
function main() {
  const out = 'public/pools';
  if (existsSync(out) && readdirSync(out).some((file) => file.endsWith('.json'))) {
    process.stderr.write(
      'FAIL public/pools/ already holds pool files. The split runs once; edit the JSON files instead.\n',
    );
    process.exit(1);
  }
  try {
    const decks = JSON.parse(readFileSync('docs/libraries/decks.json', 'utf8'));
    const genres = JSON.parse(readFileSync('docs/libraries/genres.json', 'utf8'));
    const { pools, report } = splitDecks(decks, genres);
    mkdirSync(out, { recursive: true });
    for (const pool of Object.values(pools)) {
      writeFileSync(join(out, `${pool.type}.json`), JSON.stringify(pool, null, 2) + '\n');
    }
    process.stdout.write(report.join('\n') + '\n');
    process.exit(0);
  } catch (error) {
    process.stderr.write(`FAIL ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
