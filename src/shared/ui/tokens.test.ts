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

/**
 * The 2026-11-04 card, tucked, Hook Card and note tokens by mode, copied from
 * docs/design-system.html 4.5. Dark is the :root default; light is the [data-mode="light"] block.
 */
const MODE_TOKENS_2026_11_04: Record<string, { dark: string; light: string }> = {
  '--card-face': { dark: '#2A2F38', light: '#F4F0E6' },
  '--card-tucked-1': { dark: '#2A2F38', light: '#F1ECE0' },
  '--card-tucked-2': { dark: '#2A2F38', light: '#EFE9DC' },
  '--card-tucked-3': { dark: '#2A2F38', light: '#ECE6D8' },
  '--card-tucked-4': { dark: '#2A2F38', light: '#E9E3D4' },
  '--card-cue': { dark: '#A9ADB6', light: '#5A5E68' },
  '--card-cue-active': { dark: '#ECEAE4', light: '#1B1E24' },
  '--card-adjective': { dark: '#A88BE6', light: '#6E48B5' },
  '--card-adjective-active': { dark: '#A88BE6', light: '#5B3F99' },
  '--card-divider': { dark: '#4A505C', light: '#D5CFC0' },
  '--zone-text': { dark: '#C9B6F0', light: '#4A2E86' },
  '--hook-bg': { dark: '#2A2F38', light: '#FFFFFF' },
  '--hook-text': { dark: '#ECEAE4', light: '#1B1E24' },
  '--shadow-hook': {
    dark: '0 10px 26px rgba(0, 0, 0, 0.5)',
    light: '0 8px 22px rgba(0, 0, 0, 0.18)',
  },
  '--note-bg': { dark: '#2E2A22', light: '#FBF6E4' },
  '--note-border': { dark: '1px solid #4A4436', light: 'none' },
  '--note-label': { dark: '#C9BFA6', light: '#6B6355' },
  '--note-text': { dark: '#ECEAE4', light: '#1B1E24' },
  '--shadow-note': {
    dark: '0 8px 22px rgba(0, 0, 0, 0.45)',
    light: '0 8px 22px rgba(0, 0, 0, 0.4)',
  },
};

/** The 2026-11-04 section of tokens.css: everything after its header comment. */
const V2_HEADER = '/* 2026-11-04 handoff (docs/design-system.html 4.5)';
const V2_SECTION = TOKENS.slice(TOKENS.indexOf(V2_HEADER));

/** The body of the first block that opens with the given selector in a CSS text. */
function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('}', start));
}

/** Lowercase, with the spaces inside rgba(…) removed, so equal values compare equal. */
const norm = (value: string) =>
  value
    .toLowerCase()
    .replace(/rgba\(([^)]*)\)/g, (_, inner: string) => `rgba(${inner.replace(/\s+/g, '')})`);

/** A by-mode table column as normalised [name, value] pairs. */
const expected = (mode: 'dark' | 'light') =>
  Object.entries(MODE_TOKENS_2026_11_04).map(([name, v]) => [name, norm(v[mode])]);

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
  'wrench',
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
  'copy',
  'playing-cards-fan',
  'lock-open',
  'split',
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
      // Colors outside the v1 body are allowed only for the 2026-11-04 mode tokens (design 4.5).
      if (name in MODE_TOKENS_2026_11_04) continue;
      expect([...CARRIED_OVER, ...USER_OVERRIDES], name).toContain(name);
      expect(value, name).not.toMatch(/#|rgb|hsl/i);
    }
  });

  it('tokens_v2Section_darkDefaultsMatchDesign45', () => {
    const dark = definitions(block(V2_SECTION, ':root')).map(([n, v]) => [n, norm(v)]);
    expect(dark).toEqual(expected('dark'));
  });

  it('tokens_v2Section_lightValuesMatchDesign45', () => {
    const light = definitions(block(V2_SECTION, '[data-mode="light"]')).map(([n, v]) => [
      n,
      norm(v),
    ]);
    expect(light).toEqual(expected('light'));
  });

  it('tokens_v2Section_comesAfterV1LightBlock', () => {
    const v1Light = TOKENS.indexOf('[data-mode="light"] {');
    const v2Light = TOKENS.indexOf('[data-mode="light"] {', TOKENS.indexOf(V2_HEADER));
    expect(v1Light).toBeGreaterThanOrEqual(0);
    expect(v2Light).toBeGreaterThan(v1Light);
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
