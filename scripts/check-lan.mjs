/**
 * Local network check (local-run in docs/architecture.html): `npm run start:lan` serves the
 * built app over HTTPS on port 4444 to every interface. Local only, never in CI, which has
 * no certificate: with no certificate in .certs/ it prints SKIP and exits 0. Otherwise it
 * starts `vite preview --mode lan` on the existing build (run `npm run build` first), polls
 * https://localhost:4444/ with certificate checks off for this request only, and checks for
 * a 200 answer with the GameIdea title and the theme boot script, and a Network address in
 * the server log (it listens on all interfaces). Then it checks that a second start on the
 * busy port exits with an error (strictPort), and stops the server. Port 4174 stays plain
 * HTTP and is not touched.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { request } from 'node:https';
import { join } from 'node:path';

const PORT = 4444;
const TIMEOUT_MS = 30_000;
const VITE = join('node_modules', 'vite', 'bin', 'vite.js');
const CERT = join('.certs', 'lan.pem');
const KEY = join('.certs', 'lan-key.pem');

if (!existsSync(CERT) || !existsSync(KEY)) {
  process.stdout.write('SKIP no certificate in .certs/\n');
  process.exit(0);
}
if (!existsSync(join('dist', 'index.html'))) {
  process.stdout.write('FAIL no build in dist/; run npm run build first\n');
  process.exit(1);
}

/** Starts `vite preview --mode lan`; collects its output. */
function startPreview() {
  const child = spawn(process.execPath, [VITE, 'preview', '--mode', 'lan'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const run = { child, output: '', exited: null };
  child.stdout.on('data', (chunk) => (run.output += chunk));
  child.stderr.on('data', (chunk) => (run.output += chunk));
  run.done = new Promise((resolve) =>
    child.on('exit', (code) => {
      run.exited = code;
      resolve(code);
    }),
  );
  return run;
}

/** One GET of the page; certificate checks are off for this request only. */
function fetchPage() {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: 'localhost', port: PORT, path: '/', method: 'GET', rejectUnauthorized: false },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls the page until it answers or the time runs out. */
async function waitForPage(run) {
  const until = Date.now() + TIMEOUT_MS;
  while (Date.now() < until) {
    if (run.exited !== null) return null;
    try {
      return await fetchPage();
    } catch {
      await sleep(250);
    }
  }
  return null;
}

/** Waits for a process to exit, killing it after the timeout; resolves with the exit code. */
async function exitOf(run) {
  const timer = setTimeout(() => run.child.kill(), TIMEOUT_MS);
  const code = await run.done;
  clearTimeout(timer);
  return code;
}

const problems = [];
const server = startPreview();
try {
  const page = await waitForPage(server);
  if (!page) {
    problems.push(`no answer at https://localhost:${PORT}/ within ${TIMEOUT_MS / 1000} s`);
  } else {
    if (page.status !== 200) problems.push(`status ${page.status}, not 200`);
    if (!page.body.includes('<title>GameIdea</title>')) problems.push('no GameIdea title');
    if (!page.body.includes('gameidea.settings')) problems.push('no theme boot script');
    // Vite prints the Network address once it listens; give the log a moment to arrive.
    for (let i = 0; i < 20 && !/Network:\s+https:\/\//.test(server.output); i++) await sleep(100);
    if (!/Network:\s+https:\/\//.test(server.output)) {
      problems.push('the server log names no Network address (not on all interfaces)');
    }
    const second = startPreview();
    const code = await exitOf(second);
    if (code === 0 || code === null) problems.push('a second start on the busy port did not fail');
  }
} finally {
  server.child.kill();
  await server.done;
}

if (problems.length > 0) {
  process.stdout.write(
    `FAIL HTTPS on port ${PORT}:\n- ${problems.join('\n- ')}\n${server.output}\n`,
  );
  process.exit(1);
}
process.stdout.write(
  `PASS HTTPS on port ${PORT}: 200 with the app, on all interfaces, port locked\n`,
);
