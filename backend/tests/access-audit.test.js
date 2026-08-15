const API = process.env.API_URL ?? 'http://localhost:5000';
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';

const ACCOUNTS = {
  ADMIN: 'ada.lovelace@example.com',
  DEVELOPER: 'linus.torvalds@example.com',
  USER: 'joan.clarke@example.com',
};
const PASSWORD = process.env.SEED_PASSWORD ?? 'Password123!';

const rows = [];
const note = (area, item, ok, detail = '') => rows.push({ area, item, ok, detail });

const makeClient = () => {
  const jar = new Map();
  const remember = (res) =>
    (res.headers.getSetCookie?.() ?? []).forEach((line) => {
      const [pair] = line.split(';');
      const i = pair.indexOf('=');
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (!value || value === 'undefined') jar.delete(name);
      else jar.set(name, value);
    });

  const call = async (base, method, path, body, accept) => {
    const headers = { Accept: accept ?? 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (jar.has('csrf_token')) headers['x-csrf-token'] = jar.get('csrf_token');
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    remember(res);
    const text = await res.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    return { status: res.status, body: parsed, location: res.headers.get('location') };
  };

  return {
    api: (m, p, b) => call(API, m, p, b),
    web: (p) => call(WEB, 'GET', p, undefined, 'text/html'),
  };
};

// permission required to reach each page; null means any signed-in user
const PAGES = [
  ['/overview', 'users.read'],
  ['/', 'users.read'],
  ['/teams', 'teams.read'],
  ['/permissions', 'roles.read'],
  ['/audit-logs', 'audit.read'],
  ['/settings', null],
  ['/docs', null],
  ['/support', null],
];

// [method, path, permission or null, mutating]
const ENDPOINTS = [
  ['GET', '/api/users?limit=5', 'users.read', false],
  ['GET', '/api/users/stats', 'users.read', false],
  ['GET', '/api/teams', 'teams.read', false],
  ['GET', '/api/roles', 'roles.read', false],
  ['GET', '/api/roles/permissions', 'roles.read', false],
  ['GET', '/api/audit-logs?limit=5', 'audit.read', false],
  ['GET', '/api/audit-logs/stats', 'audit.read', false],
  ['GET', '/api/account/sessions', null, false],
  ['GET', '/api/documents/docs', null, false],
  ['GET', '/api/documents/support', null, false],
  ['GET', '/api/support/requests', null, false],
  ['GET', '/api/notifications?limit=5', null, false],
  ['GET', '/api/notifications/unread-count', null, false],
  ['PUT', '/api/documents/docs', 'docs.manage', true],
  ['PUT', '/api/documents/support', 'support.manage', true],
];

async function auditRole(role) {
  const client = makeClient();
  const login = await client.api('POST', '/api/auth/login', {
    email: ACCOUNTS[role],
    password: PASSWORD,
  });
  if (login.status !== 200) {
    note(role, 'login', false, `status ${login.status}`);
    return;
  }
  note(role, 'login', true);

  const me = await client.api('GET', '/api/auth/me');
  const granted = me.body?.permissions ?? [];
  const nav = (me.body?.navigation ?? []).map((n) => n.label);
  note(role, 'session + nav', me.status === 200, nav.join(', '));
  note(
    role,
    'session carries preferences',
    'timezone' in (me.body ?? {}) && 'timeFormat' in (me.body ?? {}),
    `timeFormat=${me.body?.timeFormat}`,
  );

  for (const [path, permission] of PAGES) {
    const allowed = !permission || granted.includes(permission);
    let res = await client.web(path);

    // the access token lasts 15 minutes; a long audit can cross that boundary and
    // the middleware answers with a refresh redirect back to the same path. that is
    // not a permission denial, so retry once on the refreshed cookie.
    const refreshRedirect =
      res.status >= 300 &&
      res.status < 400 &&
      !String(res.location ?? '').includes('/login') &&
      String(res.location ?? '').includes(path);
    if (refreshRedirect) res = await client.web(path);

    const redirected = res.status >= 300 && res.status < 400;
    const ok = allowed ? res.status === 200 : redirected;
    note(
      role,
      `page ${path}`,
      ok,
      `status ${res.status}${refreshRedirect ? ' (after token refresh)' : ''}${allowed ? '' : ' (expected redirect)'}`,
    );
  }

  for (const [method, path, permission, mutating] of ENDPOINTS) {
    const allowed = !permission || granted.includes(permission);
    if (mutating && allowed) continue; // covered by the dedicated suites; do not write during an audit
    const body = mutating ? { title: 'audit probe', body: 'audit probe' } : undefined;
    const res = await client.api(method, path, body);
    const expected = allowed ? 200 : 403;
    note(
      role,
      `${method} ${path.split('?')[0]}`,
      res.status === expected,
      `got ${res.status}, expected ${expected}`,
    );
  }
}

async function main() {
  for (const role of Object.keys(ACCOUNTS)) {
    await auditRole(role);
  }

  const anon = makeClient();
  for (const [path] of PAGES) {
    const res = await anon.web(path);
    const gated = res.status >= 300 && res.status < 400;
    note('ANON', `page ${path}`, gated, gated ? 'redirects to login' : `status ${res.status}`);
  }
  for (const [, path] of [
    ['GET', '/api/users'],
    ['GET', '/api/notifications'],
    ['GET', '/api/documents/docs'],
  ]) {
    const res = await anon.api('GET', path);
    note('ANON', `GET ${path}`, res.status === 401, `got ${res.status}`);
  }
  const missing = await anon.web('/definitely-missing');
  note(
    'ANON',
    'unknown route',
    missing.status === 404 || (missing.status >= 300 && missing.status < 400),
    `status ${missing.status}`,
  );

  let area = '';
  rows.forEach((row) => {
    if (row.area !== area) {
      area = row.area;
      console.log(`\n${area}`);
    }
    console.log(`  ${row.ok ? 'ok  ' : 'FAIL'} ${row.item.padEnd(36)} ${row.detail}`);
  });

  const failed = rows.filter((r) => !r.ok);
  console.log(`\n${rows.length - failed.length}/${rows.length} checks passed`);
  if (failed.length) {
    console.log('failing:');
    failed.forEach((f) => console.log(`  ${f.area} · ${f.item} · ${f.detail}`));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('audit crashed:', error);
  process.exitCode = 1;
});
