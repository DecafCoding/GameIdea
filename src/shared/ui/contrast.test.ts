/**
 * Contrast checks for card, Hook Card and note text in both modes, read from the real
 * tokens.css (design §12, measured 2026-11-04). The deck tint (design 4.4: the deck card
 * color at 14% over the face) is composited before measuring. Thresholds are the design
 * figures minus 0.1 for rounding, not new targets.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DECKS } from '@/shared/model';

type Rgb = [number, number, number];
type Mode = 'dark' | 'light';

const TOKENS = readFileSync(join(process.cwd(), 'src/shared/ui/tokens.css'), 'utf8');

/** "#RRGGBB" as [r, g, b] in 0 to 255. */
function hex(color: string): Rgb {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) throw new Error(`Not a 6-digit hex color: ${color}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** WCAG 2.2 relative luminance. */
function relativeLuminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.2 contrast ratio of 2 colors. */
function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Straight alpha compositing of top over bottom. */
function over(top: Rgb, bottom: Rgb, alpha: number): Rgb {
  return top.map((c, i) => c * alpha + bottom[i]! * (1 - alpha)) as Rgb;
}

/** The bodies of every block whose selector is exactly the given one, in file order. */
function blocks(selector: string): string[] {
  const out: string[] = [];
  let at = TOKENS.indexOf(`${selector} {`);
  while (at >= 0) {
    const open = TOKENS.indexOf('{', at);
    out.push(TOKENS.slice(open + 1, TOKENS.indexOf('}', open)));
    at = TOKENS.indexOf(`${selector} {`, open);
  }
  return out;
}

/** The last definition of a token across the given blocks, or undefined. */
function lastDefinition(bodies: string[], name: string): string | undefined {
  let value: string | undefined;
  for (const body of bodies) {
    for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
      if (m[1] === name) value = m[2]!.trim();
  }
  return value;
}

/** A token's value for a mode: the last :root (dark) or [data-mode="light"] definition wins. */
function tokenValue(mode: Mode, name: string): string {
  const dark = lastDefinition(blocks(':root'), name);
  const light = mode === 'light' ? lastDefinition(blocks('[data-mode="light"]'), name) : undefined;
  const value = light ?? dark;
  if (!value) throw new Error(`Token ${name} is not defined for ${mode}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  return ref ? tokenValue(mode, ref[1]!) : value;
}

const color = (mode: Mode, name: string) => hex(tokenValue(mode, name));

/** A face color with the deck tint laid over it (design 4.4). */
function tintedFace(mode: Mode, deck: string, face = '--card-face'): Rgb {
  return over(color(mode, `--deck-${deck}`), color(mode, face), 0.14);
}

/** Card decks: DECKS holds the 11 decks; the Hook Card has no deck color and no tint. */
const CARD_DECKS = DECKS;

/** Design 4.2: --accent-text by mode and theme color, copied from the combined selectors. */
const ACCENT_TEXT: Record<Mode, string[]> = {
  dark: ['#F6B08A', '#A9C8FF', '#8FDDB5'],
  light: ['#B4531A', '#2B5FB8', '#1F7A4F'],
};

describe('contrast (design §12)', () => {
  it('contrast_darkActiveCueOnFace_atLeast11_1', () => {
    expect(
      contrast(color('dark', '--card-cue-active'), color('dark', '--card-face')),
    ).toBeGreaterThanOrEqual(11.1);
  });

  it('contrast_darkInactiveCueOnFace_atLeast5_9', () => {
    expect(
      contrast(color('dark', '--card-cue'), color('dark', '--card-face')),
    ).toBeGreaterThanOrEqual(5.9);
  });

  it('contrast_darkAdjectiveOnFace_atLeast4_7', () => {
    expect(
      contrast(color('dark', '--card-adjective'), color('dark', '--card-face')),
    ).toBeGreaterThanOrEqual(4.7);
  });

  it('contrast_darkInactiveCueOnTintedFace_atLeast5_2ForEveryDeck', () => {
    for (const deck of CARD_DECKS) {
      expect(
        contrast(color('dark', '--card-cue'), tintedFace('dark', deck)),
        deck,
      ).toBeGreaterThanOrEqual(5.2);
    }
  });

  it('contrast_lightInactiveCueOnTintedFace_atLeast4_6ForEveryDeck', () => {
    for (const deck of CARD_DECKS) {
      expect(
        contrast(color('light', '--card-cue'), tintedFace('light', deck)),
        deck,
      ).toBeGreaterThanOrEqual(4.6);
    }
  });

  it('contrast_activeCueOnEveryTintedFaceAndTuckedFace_atLeast4_5', () => {
    const faces = [
      '--card-face',
      '--card-tucked-1',
      '--card-tucked-2',
      '--card-tucked-3',
      '--card-tucked-4',
    ];
    for (const mode of ['dark', 'light'] as const) {
      for (const deck of CARD_DECKS) {
        for (const face of faces) {
          const ratio = contrast(color(mode, '--card-cue-active'), tintedFace(mode, deck, face));
          expect(ratio, `${mode} ${deck} ${face}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('contrast_darkNote_textAtLeast11_8_labelAtLeast7_7', () => {
    const paper = color('dark', '--note-bg');
    expect(contrast(color('dark', '--note-text'), paper)).toBeGreaterThanOrEqual(11.8);
    expect(contrast(color('dark', '--note-label'), paper)).toBeGreaterThanOrEqual(7.7);
  });

  it('contrast_lightHookSentence_atLeast16_6', () => {
    expect(
      contrast(color('light', '--hook-text'), color('light', '--hook-bg')),
    ).toBeGreaterThanOrEqual(16.6);
  });

  it('contrast_hookLabelAccentText_atLeast4_9EveryThemeBothModes', () => {
    for (const mode of ['dark', 'light'] as const) {
      for (const text of ACCENT_TEXT[mode]) {
        expect(
          contrast(hex(text), color(mode, '--hook-bg')),
          `${mode} ${text}`,
        ).toBeGreaterThanOrEqual(4.9);
      }
    }
  });
});
