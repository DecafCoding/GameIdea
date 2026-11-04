/**
 * Self-tests of the color lint (scripts/check-css-colors.mjs): it runs against temporary
 * folders, never src/, and fails a card token defined outside tokens.css and an unlisted
 * fixed reason, while a listed reason and a plain token use pass.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'scripts', 'check-css-colors.mjs');
const made: string[] = [];

/** Runs the lint on a temp root holding one CSS module with the given text. */
function lint(css: string) {
  const root = mkdtempSync(join(tmpdir(), 'gameidea-lint-'));
  made.push(root);
  mkdirSync(join(root, 'shared', 'ui'), { recursive: true });
  writeFileSync(join(root, 'shared', 'ui', 'tokens.css'), ':root {\n  --card-face: #2A2F38;\n}\n');
  writeFileSync(join(root, 'Thing.module.css'), css);
  const run = spawnSync(process.execPath, [SCRIPT, root], { encoding: 'utf8' });
  return { status: run.status, out: run.stdout };
}

afterEach(() => {
  for (const root of made.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('color lint', () => {
  it('cssColorLint_cardTokenOutsideTokens_fails', () => {
    const { status, out } = lint('.x {\n  --card-face: var(--surface);\n}\n');
    expect(status).toBe(1);
    expect(out).toContain('follow data-mode only through tokens.css');
  });

  it('cssColorLint_unlistedFixedReason_fails', () => {
    const { status, out } = lint(
      '.x {\n  color: #f6b08a; /* fixed: Hook label keeps dark text */\n}\n',
    );
    expect(status).toBe(1);
    expect(out).toContain('unlisted fixed reason');
  });

  it('cssColorLint_listedFixedReason_passes', () => {
    const { status, out } = lint('.x {\n  color: #fff; /* fixed: white on deck color */\n}\n');
    expect(status).toBe(0);
    expect(out).toContain('PASS');
  });

  it('cssColorLint_tokenUseNotDefinition_passes', () => {
    const { status } = lint(
      '.x {\n  color: var(--card-cue);\n  --card-type: var(--deck-role);\n}\n',
    );
    expect(status).toBe(0);
  });
});
