/**
 * Port lock check for CI (local-run in docs/architecture.html): the browser stores boards
 * per address and port, so `npm run dev` (5174) and `npm start`'s preview (4174) must exit
 * with an error on a busy port, never move to another one. For each port this script holds
 * the port, starts Vite on it and expects a non-zero exit that names the port within 30 s.
 * The port is held on the loopback addresses, where Vite listens for "localhost": Windows
 * lets a localhost server start beside one on the wildcard address, so a wildcard hold
 * would not make the port busy there. Run after `npm run build` (vite preview needs dist/).
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';

const TIMEOUT_MS = 30_000;
const VITE = join('node_modules', 'vite', 'bin', 'vite.js');

const LOOPBACK = ['127.0.0.1', '::1'];

/**
 * Holds the port on one address. A port that is already busy counts as held, and a machine
 * without that address (no IPv6) is skipped.
 */
function holdOn(port, host) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE' || error.code === 'EADDRNOTAVAIL') resolve(null);
      else reject(error);
    });
    server.listen(port, host, () => resolve(server));
  });
}

/** Holds the port on both loopback addresses; returns the servers to close. */
async function holdPort(port) {
  const servers = await Promise.all(LOOPBACK.map((host) => holdOn(port, host)));
  return servers.filter((server) => server !== null);
}

/** Starts Vite with the args and resolves with its exit code and output, or a timeout. */
function runVite(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VITE, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: null, output });
    }, TIMEOUT_MS);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
}

/** Why the run failed the check, or null when Vite refused the busy port. */
function problem({ code, output }, port) {
  if (code === null) return `still running after ${TIMEOUT_MS / 1000} s`;
  if (code === 0) return 'exited with 0';
  const other = /localhost:(\d+)/.exec(output);
  if (other && other[1] !== String(port)) return `moved to port ${other[1]}`;
  if (!output.includes(String(port))) return 'the error does not name the port';
  return null;
}

let failed = false;
for (const [name, port, args] of [
  ['dev', 5174, []],
  ['preview', 4174, ['preview']],
]) {
  const servers = await holdPort(port);
  const result = await runVite(args);
  await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  const why = problem(result, port);
  if (why) {
    failed = true;
    process.stdout.write(`FAIL ${name} on busy port ${port}: ${why}\n${result.output}\n`);
  } else {
    process.stdout.write(`PASS ${name} on busy port ${port}: exited with an error\n`);
  }
}

process.exit(failed ? 1 : 0);
