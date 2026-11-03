/**
 * Token parity with the design handoff, and the shipped icon files.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { IconName } from './Icon';

/** Reads the --name: value pairs from the first :root block of a CSS file. */
function rootTokens(path: string): Map<string, string> {
  const css = readFileSync(join(process.cwd(), path), 'utf8');
  const root = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const tokens = new Map<string, string>();
  for (const match of root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1]!, match[2]!.trim());
  }
  return tokens;
}

const ICONS: IconName[] = [
  'person',
  'target',
  'pin',
  'bolt',
  'tag',
  'cube',
  'burst',
  'alert-circle',
  'anvil',
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

/**
 * Tokens the design system changed after the handoff bundle, per its handoff log
 * (docs/design-system.html section 2). The bundle stays as it was delivered.
 */
const LATER_DECISIONS: Record<string, string> = {
  // 2026-10-29: card size 200 → 250 px.
  '--card': '250px',
  // 2026-10-29: tuck offset 56 → 59 px, so a tucked card shows 3 px more.
  '--tuck-offset': '59px',
  // 2026-10-31: type colors moved: Character blue, Motivation green, Setting brown.
  '--type-character': '#3B6FD1',
  '--type-character-dark': '#2B539E',
  '--type-motivation': '#2F8F83',
  '--type-motivation-dark': '#1F6B61',
  '--type-setting': '#B8700E',
  '--type-setting-dark': '#8C540A',
};

describe('design tokens', () => {
  it('tokens_everyHandoffToken_hasSameValue', () => {
    const handoff = rootTokens('docs/design-handoff/_ds/gameidea/styles.css');
    const app = rootTokens('src/shared/ui/tokens.css');
    expect(handoff.size).toBeGreaterThan(50);
    expect(Object.fromEntries(app)).toEqual({ ...Object.fromEntries(handoff), ...LATER_DECISIONS });
  });

  it('icons_everyIconFile_existsAndUsesStroke22', () => {
    for (const name of ICONS) {
      const path = join(process.cwd(), 'public', 'icons', `${name}.svg`);
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, 'utf8')).toContain('stroke-width="2.2"');
    }
  });

  it('icons_checkIcon_existsAndUsesStroke26', () => {
    // Design section 7: the check is the one icon drawn at stroke 2.6.
    const path = join(process.cwd(), 'public', 'icons', 'check.svg');
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, 'utf8')).toContain('stroke-width="2.6"');
  });
});
