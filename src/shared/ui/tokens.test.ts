/**
 * Token checks: tokens.css holds the handoff token set verbatim plus only the allowed,
 * non-color carried-over and user-override tokens, and every var(--name) used in src/ is
 * defined. Also the shipped icon files.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DECKS } from '@/shared/model';
import type { IconName } from './Icon';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const HANDOFF = read('docs/design-handoff/_ds/gameidea/styles.css');
const TOKENS = read('src/shared/ui/tokens.css');
/** The handoff file from its first :root { to the end. */
const HANDOFF_BODY = HANDOFF.slice(HANDOFF.indexOf(':root {'));

/** Tokens kept from TheForge until Phase 2: card geometry and motion, never colors. */
const CARRIED_OVER = ['--t-turn-90', '--t-turn-180', '--t-draw', '--t-fade', '--t-banner'];
/** Handoff tokens the user changed later (recorded in docs/design-system.html), never colors. */
const USER_OVERRIDES = ['--radius-card'];

/** Every "--name: value" definition in a CSS text. */
function definitions(css: string): [string, string][] {
  return [...css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]);
}

/** Every .css, .ts and .tsx file under a folder. */
function sourceFiles(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(css|tsx?)$/.test(entry.name) ? [path] : [];
  });
}

/** Every icon drawn at stroke 2.2 (check.svg is the one at 2.6). */
const ICONS: IconName[] = [
  'hook',
  'user',
  'repeat',
  'battery',
  'flag',
  'zap',
  'user-plus',
  'battery-plus',
  'map-pin-plus',
  'map-pin',
  'smile',
  'rotate-ccw',
  'trending-up',
  'shield-x',
  'settings',
  'sliders-horizontal',
  'align-left',
  'lock',
  'x',
  'minus',
  'ellipsis',
  'triangle-alert',
  'refresh-cw',
  'alert-circle',
  'undo',
  'redo',
  'note',
  'trash',
  'pencil',
  'plus',
  'download',
  'chevron-down',
  'file-text',
  'board-file',
  'upload',
  'file-x',
];

describe('design tokens', () => {
  it('tokens_handoffBody_isCopiedVerbatim', () => {
    expect(HANDOFF_BODY.length).toBeGreaterThan(1000);
    expect(TOKENS).toContain(HANDOFF_BODY);
  });

  it('tokens_carriedOverTokens_areAllowedAndNotColors', () => {
    const outside = TOKENS.replace(HANDOFF_BODY, '');
    const extra = definitions(outside);
    expect(extra.length).toBeGreaterThan(0);
    for (const [name, value] of extra) {
      expect([...CARRIED_OVER, ...USER_OVERRIDES], name).toContain(name);
      expect(value, name).not.toMatch(/#|rgb|hsl/i);
    }
  });

  it('tokens_everyVarUsedInSrc_isDefined', () => {
    const files = sourceFiles('src');
    const defined = new Set(definitions(TOKENS).map(([name]) => name));
    // Local custom properties set in src/: "--name:" in CSS or '--name' as a style key.
    for (const file of files) {
      const text = read(file);
      for (const m of text.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]!);
      for (const m of text.matchAll(/['"](--[\w-]+)['"]\s*:/g)) defined.add(m[1]!);
    }
    const missing: string[] = [];
    for (const file of files) {
      for (const m of read(file).matchAll(/var\((--[\w-]*)(\$\{[^}]+\})?([\w-]*)\)/g)) {
        const [, start, template, end] = m;
        // A template use such as var(--deck-${type}) must resolve for every deck (a Hook Card
        // has no deck color and never reaches these templates).
        const names = template ? DECKS.map((t) => `${start!}${t}${end!}`) : [start!];
        for (const name of names) if (!defined.has(name)) missing.push(`${file}: ${name}`);
      }
      // Tokens read from script, such as getPropertyValue('--t-draw').
      for (const m of read(file).matchAll(/getPropertyValue\(['"](--[\w-]+)['"]\)/g)) {
        if (!defined.has(m[1]!)) missing.push(`${file}: ${m[1]!}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('icons_everyIconFile_existsAndUsesStroke22', () => {
    for (const name of ICONS) {
      const path = join(process.cwd(), 'public', 'icons', `${name}.svg`);
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, 'utf8')).toContain('stroke-width="2.2"');
    }
  });

  it('icons_everyIconFile_isUsedOrListed', () => {
    const files = readdirSync(join(process.cwd(), 'public', 'icons'))
      .filter((name) => name.endsWith('.svg'))
      .map((name) => name.slice(0, -'.svg'.length));
    expect(files.sort()).toEqual([...ICONS, 'check'].sort());
  });

  it('icons_checkIcon_existsAndUsesStroke26', () => {
    // Design section 7: the check is the one icon drawn at stroke 2.6.
    const path = join(process.cwd(), 'public', 'icons', 'check.svg');
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, 'utf8')).toContain('stroke-width="2.6"');
  });
});
