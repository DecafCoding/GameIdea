/**
 * Story-name check (architecture risk "Story code left in the copy"): no TheForge story type
 * or Setting kind name may come back under src/. It walks every .ts, .tsx, .css and .json
 * file except this one and reports file:line for each hit. The names are built from
 * fragments, so this file does not match itself even if the self-exclusion breaks.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');
const SELF = fileURLToPath(import.meta.url);
const EXTENSIONS = ['.ts', '.tsx', '.css', '.json'];

/** The 3 story types with no GameIdea counterpart of the same name, whole word, any case. */
const STORY_TYPES = new RegExp(
  `\\b(${['char' + 'acter', 'motiv' + 'ation', 'descr' + 'iption'].join('|')})\\b`,
  'i',
);

/** Setting kind identifiers and attributes. */
const KIND_NAMES = new RegExp(
  ['Cue' + 'Kind', 'KIND' + '_ICON', 'SETTING' + '_KINDS', 'data' + '-kind'].join('|'),
);

/** The 3 Setting kind values as string literals, single or double quoted. */
const KIND_VALUES = new RegExp(
  `['"](${['pl' + 'ace', 'ev' + 'ent', 'obj' + 'ect'].join('|')})['"]`,
);

/** typeof x === 'object' is a type check, not a Setting kind. */
const TYPEOF_OBJECT = /typeof\s+[\w.]+\s*[!=]==\s*['"]object['"]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return EXTENSIONS.some((ext) => entry.name.endsWith(ext)) && path !== SELF ? [path] : [];
  });
}

/** Every "file:line: text" whose line matches the test. */
function hits(test: (line: string) => boolean): string[] {
  return sourceFiles(SRC).flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, i) =>
        test(line) ? [`${relative(process.cwd(), file)}:${i + 1}: ${line.trim()}`] : [],
      ),
  );
}

describe('storyNames', () => {
  it('storyNames_srcFiles_haveNoStoryTypeNames', () => {
    const found = hits((line) => STORY_TYPES.test(line));
    expect(found, `Story type names in src/:\n${found.join('\n')}`).toEqual([]);
  });

  it('storyNames_srcFiles_haveNoSettingKindNames', () => {
    const found = hits(
      (line) => KIND_NAMES.test(line) || (KIND_VALUES.test(line) && !TYPEOF_OBJECT.test(line)),
    );
    expect(found, `Setting kind names in src/:\n${found.join('\n')}`).toEqual([]);
  });
});
