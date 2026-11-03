/**
 * Tests for the Settings dialog's fixed words: the footer shows the package.json version.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_VERSION, FOOTER_TEXT } from './keys';

describe('keys', () => {
  it('footerText_usesPackageVersion', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
    expect(FOOTER_TEXT).toBe(`GameIdea ${pkg.version} · No account. No data leaves this computer.`);
  });
});
