/**
 * Color check for `npm run lint` (mvp-plan M1, design-system sections 4.4 and 4.5): chrome,
 * card, Hook Card and note colors come from src/shared/ui/tokens.css; only deck colors, white
 * on a deck or danger color, and the theme swatches are literal. In a CSS file under the root
 * (default src/) other than tokens.css:
 *   - a hex, rgb(a) or hsl(a) value fails, unless its line ends in a "fixed: <reason>" comment
 *     whose reason is one of FIXED_REASONS;
 *   - defining a card, Hook Card or note token fails, because those follow data-mode only
 *     through tokens.css (design 4.5).
 * Comments are stripped before the color search, keeping line numbers, so a color named in a
 * comment never fails. An optional first argument sets the root folder, for the self-tests.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.argv[2] ?? 'src';
const TOKENS = join(ROOT, 'shared', 'ui', 'tokens.css');
const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(/;
const FIXED = /\/\*\s*fixed:\s*([^*]+?)\s*\*\/\s*$/;
/** The only reasons a literal color may carry. */
const FIXED_REASONS = ['white on deck color', 'white on --danger', 'theme color swatch'];
/** A card, Hook Card or note token definition (design 4.5); --card-type and --card-size are not in it. */
const MODE_TOKEN =
  /^\s*--(card-(face|tucked-\d|cue|cue-active|adjective|adjective-active|divider)|hook-(bg|text)|note-(bg|border|label|text)|zone-text|shadow-(hook|note|card))\s*:/;

/** Lists every .css file under a folder, recursively. */
function cssFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

/** Replaces every comment character with a space, keeping newlines, so lines stay aligned. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

let failed = false;
const fail = (file, i, line, why) => {
  failed = true;
  process.stdout.write(`FAIL ${relative('.', file)}:${i + 1}: ${line.trim()}${why}\n`);
};

for (const file of cssFiles(ROOT)) {
  if (relative('.', file) === relative('.', TOKENS)) continue;
  const original = readFileSync(file, 'utf8').split('\n');
  const stripped = stripComments(original.join('\n')).split('\n');
  stripped.forEach((line, i) => {
    if (MODE_TOKEN.test(line)) {
      fail(
        file,
        i,
        original[i],
        ' (card, Hook Card and note colors follow data-mode only through tokens.css (design 4.5))',
      );
      return;
    }
    if (!COLOR.test(line)) return;
    const fixed = FIXED.exec(original[i]);
    if (!fixed) return fail(file, i, original[i], '');
    if (!FIXED_REASONS.includes(fixed[1])) fail(file, i, original[i], ' (unlisted fixed reason)');
  });
}

process.stdout.write(
  failed
    ? `FAIL hard-coded colors or mode tokens in CSS under ${ROOT}/; use a design token.\n`
    : `PASS no hard-coded colors in CSS under ${ROOT}/.\n`,
);
process.exit(failed ? 1 : 0);
