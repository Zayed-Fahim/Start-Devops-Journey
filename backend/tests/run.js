const { spawn } = require('child_process');
const path = require('path');

const API = process.env.API_URL ?? 'http://localhost:5000';
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';

// The API allows 300 requests a minute. Run back to back these suites exceed
// that and every later assertion fails with 429, which reads like a broken
// feature rather than a throttle. Instead of guessing a fixed pause, ask the
// API how much budget is left and wait for the window to reset when it is low.
const HEADROOM = Number(process.env.TEST_HEADROOM ?? 150);

const SUITES = [
  { file: 'roles.test.js', label: 'dynamic roles', needsWeb: false },
  { file: 'teams.test.js', label: 'teams', needsWeb: false },
  { file: 'rbac.test.js', label: 'rbac guards', needsWeb: false },
  { file: 'content.test.js', label: 'docs, support, notifications', needsWeb: false },
  { file: 'access-audit.test.js', label: 'cross role access audit', needsWeb: true },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const reachable = async (url) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return res.status > 0;
  } catch {
    return false;
  }
};

const rateLimitBudget = async () => {
  try {
    const res = await fetch(`${API}/healthz`, { signal: AbortSignal.timeout(4000) });
    const remaining = Number(res.headers.get('ratelimit-remaining'));
    const reset = Number(res.headers.get('ratelimit-reset'));
    if (!Number.isFinite(remaining)) return null;
    return { remaining, reset: Number.isFinite(reset) ? reset : 60 };
  } catch {
    return null;
  }
};

const waitForBudget = async () => {
  const budget = await rateLimitBudget();
  if (!budget) {
    await wait(20000);
    return;
  }
  if (budget.remaining >= HEADROOM) return;
  const seconds = Math.max(1, budget.reset + 1);
  console.log(
    `\n     ${budget.remaining} requests left in the window, waiting ${seconds}s for it to reset`,
  );
  await wait(seconds * 1000);
};

const runSuite = (file) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
    child.on('close', (code) => resolve(code ?? 1));
  });

(async () => {
  const only = process.argv[2];
  const apiUp = await reachable(`${API}/healthz`);
  if (!apiUp) {
    console.error(`\nThe API is not answering at ${API}. Start it with: pnpm run dev\n`);
    process.exit(1);
  }
  const webUp = await reachable(WEB);

  const selected = only ? SUITES.filter((s) => s.file.startsWith(only)) : SUITES;
  if (selected.length === 0) {
    console.error(`No suite matches "${only}". Available: ${SUITES.map((s) => s.file).join(', ')}`);
    process.exit(1);
  }

  const results = [];
  for (let index = 0; index < selected.length; index += 1) {
    const suite = selected[index];

    if (suite.needsWeb && !webUp) {
      console.log(`\n──── ${suite.label} — skipped, no frontend at ${WEB}`);
      results.push({ ...suite, code: null });
      continue;
    }

    console.log(`\n──── ${suite.label} (${suite.file})`);
    const code = await runSuite(suite.file);
    results.push({ ...suite, code });

    if (index < selected.length - 1) await waitForBudget();
  }

  console.log('\n════ summary');
  results.forEach((result) => {
    const status = result.code === null ? 'skipped' : result.code === 0 ? 'passed' : 'FAILED';
    console.log(`  ${status.padEnd(8)} ${result.label}`);
  });

  const failed = results.filter((result) => result.code !== null && result.code !== 0);
  process.exit(failed.length > 0 ? 1 : 0);
})();
