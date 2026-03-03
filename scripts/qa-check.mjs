import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname } from 'node:path';

const args = process.argv.slice(2);

function parseFlag(name, fallback) {
  const prefix = `--${name}=`;
  const raw = args.find(arg => arg.startsWith(prefix));
  if (!raw) return fallback;
  const value = Number(raw.slice(prefix.length));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseStringFlag(name, fallback) {
  const prefix = `--${name}=`;
  const raw = args.find(arg => arg.startsWith(prefix));
  return raw ? raw.slice(prefix.length) : fallback;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });

    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        code: code ?? 1,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

function toStatus(ok) {
  return ok ? 'PASS' : 'FAIL';
}

async function ensureCsvHeader(filePath) {
  if (existsSync(filePath)) {
    const current = await readFile(filePath, 'utf8');
    if (current.trim().length > 0) return;
  }

  const header = [
    'timestamp',
    'cycle',
    'lint_status',
    'lint_duration_ms',
    'web_build_status',
    'web_build_duration_ms',
    'server_build_status',
    'server_build_duration_ms',
    'total_duration_ms',
  ].join(',') + '\n';

  await mkdir(dirname(filePath), { recursive: true });

  await writeFile(filePath, header, 'utf8');
}

async function main() {
  const repeat = parseFlag('repeat', 1);
  const interval = parseFlag('interval', 60);
  const reportPath = parseStringFlag('report', 'reports/qa-runs.csv');

  await ensureCsvHeader(reportPath);

  let hasFailure = false;

  for (let cycle = 1; cycle <= repeat; cycle++) {
    const cycleStart = Date.now();
    const timestamp = new Date(cycleStart).toISOString();

    console.log(`\n[qa] cycle ${cycle}/${repeat} at ${timestamp}`);

    const lint = await runCommand('npm', ['run', 'lint']);
    const webBuild = await runCommand('npm', ['run', 'build']);
    const serverBuild = await runCommand('npm', ['run', 'build'], { cwd: 'server' });

    const row = [
      timestamp,
      cycle,
      toStatus(lint.ok),
      lint.durationMs,
      toStatus(webBuild.ok),
      webBuild.durationMs,
      toStatus(serverBuild.ok),
      serverBuild.durationMs,
      Date.now() - cycleStart,
    ].join(',') + '\n';

    await appendFile(reportPath, row, 'utf8');

    const cycleFailed = !lint.ok || !webBuild.ok || !serverBuild.ok;
    if (cycleFailed) {
      hasFailure = true;
      console.error(`[qa] cycle ${cycle} finished with failures, report appended: ${reportPath}`);
    } else {
      console.log(`[qa] cycle ${cycle} all checks passed, report appended: ${reportPath}`);
    }

    if (cycle < repeat) {
      console.log(`[qa] waiting ${interval}s before next cycle...`);
      await sleep(interval * 1000);
    }
  }

  process.exit(hasFailure ? 1 : 0);
}

main().catch((err) => {
  console.error('[qa] failed to run:', err);
  process.exit(1);
});
