/**
 * Hard-coded color check for `npm run lint` (mvp-plan M1, design-system section 4): every
 * chrome color in a CSS file under src/ comes from a design token in
 * src/shared/ui/tokens.css. A hex, rgb(a) or hsl(a) value anywhere else fails, unless its
 * line ends in a "fixed: <reason>" comment (white on a deck color or on --danger).
 * Comments are stripped before the search, keeping line numbers, so a color named in a
 * comment never fails.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'src';
const TOKENS = join('src', 'shared', 'ui', 'tokens.css');
const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(/;
const ALLOWED = /\/\*\s*fixed:\s*[^*]+\*\/\s*$/;

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
for (const file of cssFiles(ROOT)) {
  if (relative('.', file) === TOKENS) continue;
  const original = readFileSync(file, 'utf8').split('\n');
  const stripped = stripComments(original.join('\n')).split('\n');
  stripped.forEach((line, i) => {
    if (!COLOR.test(line) || ALLOWED.test(original[i])) return;
    failed = true;
    process.stdout.write(`FAIL ${relative('.', file)}:${i + 1}: ${original[i].trim()}\n`);
  });
}

process.stdout.write(
  failed
    ? 'FAIL hard-coded colors in CSS under src/; use a design token.\n'
    : 'PASS no hard-coded colors in CSS under src/.\n',
);
process.exit(failed ? 1 : 0);
