import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const wranglerCli = resolve(frontendDir, 'node_modules/wrangler/bin/wrangler.js');
const viteCli = resolve(frontendDir, 'node_modules/vite/bin/vite.js');
const children = [];

function start(args) {
  const child = spawn(process.execPath, args, {
    cwd: frontendDir,
    stdio: 'inherit',
  });
  children.push(child);
  return child;
}

function waitForClose(child) {
  return new Promise((resolveClose, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolveClose({ code, signal }));
  });
}

function stopChildren() {
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
}

async function ensureAssets() {
  if (existsSync(resolve(frontendDir, 'dist/index.html'))) return;
  console.log('Building frontend assets required by the local Worker...');
  const build = spawn(process.execPath, [viteCli, 'build'], {
    cwd: frontendDir,
    stdio: 'inherit',
  });
  const result = await waitForClose(build);
  if (result.code !== 0) throw new Error('Frontend asset build failed.');
}

async function waitForWorker(worker) {
  const workerExit = waitForClose(worker);
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const exited = await Promise.race([
      workerExit.then(result => ({ result })),
      new Promise(resolveRetry => setTimeout(() => resolveRetry(null), 1000)),
    ]);
    if (exited) {
      throw new Error(`Local Worker exited before becoming ready (code ${exited.result.code ?? exited.result.signal}).`);
    }

    try {
      const response = await fetch('http://127.0.0.1:8787/api/maintenance', {
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) return;
    } catch {
      // Wrangler is still starting; retry until its API is reachable.
    }
  }

  throw new Error('Local Worker did not become ready on port 8787 within 60 seconds.');
}

process.on('SIGINT', stopChildren);
process.on('SIGTERM', stopChildren);

try {
  await ensureAssets();
  const worker = start([
    wranglerCli,
    'dev',
    '--config',
    'wrangler.toml',
    '--inspector-port',
    '0',
  ]);
  await waitForWorker(worker);
  console.log('Local Worker API ready at http://localhost:8787');

  const vite = start([viteCli]);
  const result = await Promise.race(children.map(waitForClose));
  stopChildren();
  process.exitCode = result.code ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  stopChildren();
  process.exitCode = 1;
}
