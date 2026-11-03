/**
 * Tests that GENRES matches the genre names in docs/libraries/genres.json, in order, by the
 * kebab-case rule: lowercase, drop "&", and every run of spaces and punctuation becomes one
 * "-". The Phase 2 pool split uses the same ids.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GENRES } from '.';

/** "Builder & Management" becomes "builder-management". */
function kebab(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

describe('GENRES', () => {
  it('genres_libraryNames_matchInOrder', () => {
    const file = join(process.cwd(), 'docs', 'libraries', 'genres.json');
    const names = Object.keys(JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>);
    expect([...GENRES]).toEqual(names.map(kebab));
  });

  it('genres_list_has21WithNoGeneric', () => {
    expect(GENRES).toHaveLength(21);
    expect(new Set(GENRES).size).toBe(21);
    expect(GENRES as readonly string[]).not.toContain(`generic`);
  });
});
