/**
 * Size check for CI and `npm run size` (nfr-targets in docs/architecture.html):
 * the JavaScript in dist/ must be 250 KB or less gzip, and the pool files in
 * public/pools/ must be 100 KB or less gzip (nfr-targets amended 2026-10-30).
 * Run after `npm run build`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const JS_LIMIT = 250 * 1024;
const POOLS_LIMIT = 100 * 1024;

/** Lists every file under a folder, recursively. */
function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

if (!existsSync('dist')) {
  process.stdout.write('FAIL dist/ is missing; run npm run build first.\n');
  process.exit(1);
}

const jsBytes = filesUnder('dist')
  .filter((file) => file.endsWith('.js'))
  .reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0);

const poolsDir = join('public', 'pools');
const poolBytes = existsSync(poolsDir)
  ? filesUnder(poolsDir)
      .filter((file) => file.endsWith('.json'))
      .reduce((sum, file) => sum + gzipSync(readFileSync(file)).length, 0)
  : 0;

let failed = false;
for (const [label, bytes, limit] of [
  ['JavaScript (gzip)', jsBytes, JS_LIMIT],
  ['Pool files (gzip)', poolBytes, POOLS_LIMIT],
]) {
  const ok = bytes <= limit;
  failed ||= !ok;
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'} ${label}: ${kb(bytes)} of ${kb(limit)}\n`);
}

process.exit(failed ? 1 : 0);
