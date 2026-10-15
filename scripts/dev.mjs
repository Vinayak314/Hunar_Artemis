// Runs the API and the client dev server together: `npm run dev` from the repo root.
// `npm run dev:phone` (node scripts/dev.mjs --phone) does the same, but also opens the client dev
// server to your Wi-Fi so a real phone can use it. See "Test on your phone" in the README.
// No dependencies. If either process exits, the other is stopped too.
import { spawn } from 'node:child_process';
import os from 'node:os';

const phone = process.argv.includes('--phone');
const clientPort = 3000; // keep in sync with server.port in client/vite.config.ts
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const yellow = '\x1b[33m';

// Only the client reads HUNAR_LAN. Remove any stray value so plain `npm run dev` can never become
// reachable from the network by accident.
const clientEnv = { ...process.env };
if (phone) clientEnv.HUNAR_LAN = '1';
else delete clientEnv.HUNAR_LAN;

const apps = [
  { name: 'server', color: '\x1b[36m', args: ['--prefix', 'server', 'run', 'dev'], env: process.env },
  { name: 'client', color: '\x1b[35m', args: ['--prefix', 'client', 'run', 'dev'], env: clientEnv },
];

/** IPv4 addresses other devices on the same network can reach (Wi-Fi, Ethernet, hotspot). */
function lanAddresses() {
  const found = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list ?? []) {
      const isV4 = a.family === 'IPv4' || a.family === 4;
      if (isV4 && !a.internal && !a.address.startsWith('169.254.')) found.push({ name, address: a.address });
    }
  }
  return found;
}

function printPhoneBanner() {
  const say = (text = '') => console.log(`${yellow}[phone]${reset} ${text}`);
  const urls = lanAddresses();
  say(`${bold}PHONE MODE${reset}`);
  if (urls.length === 0) {
    say('No Wi-Fi/LAN address found. Connect this computer to Wi-Fi, then run this again.');
  } else {
    say('Open this on your phone (the phone and this laptop must be on the same Wi-Fi):');
    for (const { name, address } of urls) say(`    ${bold}http://${address}:${clientPort}${reset}   (${name})`);
  }
  say(`${bold}WARNING:${reset} this exposes the dev app and its API to everyone on that network.`);
  say('Use trusted Wi-Fi only, and press Ctrl+C when you are done.');
  say('If macOS asks about incoming connections for "node", choose Allow.');
  say('Location, copy/share and microphone need HTTPS: see "Test on your phone" in the README.');
  if (!process.env.MONGODB_DB) say('Tip: test against a throwaway database: MONGODB_DB=hunar_dev npm run dev:phone');
  say();
}

const children = [];
let alive = 0;
let stopping = false;
let exitCode = 0;

function stopAll(code) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  // Normally we exit as soon as both children are gone (see the exit handler below). If one hangs,
  // force-kill it so ports 3000 and 4000 are never left held.
  setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
    process.exit(code);
  }, 5000).unref();
}

function prefixLines(stream, out, tag) {
  let pending = '';
  stream.on('data', (chunk) => {
    pending += chunk;
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines) out.write(`${tag}${line}\n`);
  });
  stream.on('end', () => {
    if (pending) out.write(`${tag}${pending}\n`);
  });
}

if (phone) printPhoneBanner();

for (const app of apps) {
  const tag = `${app.color}[${app.name}]${reset} `;
  const child = spawn(npm, app.args, { stdio: ['inherit', 'pipe', 'pipe'], env: app.env });
  children.push(child);
  alive += 1;
  prefixLines(child.stdout, process.stdout, tag);
  prefixLines(child.stderr, process.stderr, tag);
  child.on('exit', (code) => {
    alive -= 1;
    if (stopping) {
      if (alive === 0) process.exit(exitCode);
      return;
    }
    console.error(`${tag}exited with code ${code}. Stopping the other process.`);
    stopAll(code ?? 1);
  });
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
