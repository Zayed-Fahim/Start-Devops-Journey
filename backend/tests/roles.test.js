const BASE = process.env.API_URL ?? 'http://localhost:5000';
const PASSWORD = process.env.SEED_PASSWORD ?? 'Password123!';
const ADMIN = { email: 'ada.lovelace@example.com', password: PASSWORD };

let passed = 0;
let failed = 0;
const failures = [];

const check = (name, condition, detail) => {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const jar = new Map();

const rememberCookies = (res) => {
  const raw = res.headers.getSetCookie?.() ?? [];
  raw.forEach((line) => {
    const [pair] = line.split(';');
    const index = pair.indexOf('=');
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (value === '' || value === 'undefined') jar.delete(name);
    else jar.set(name, value);
  });
};

const cookieHeader = () =>
  [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');

const call = async (method, path, body, extraHeaders = {}) => {
  const headers = { Accept: 'application/json', ...extraHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (jar.size) headers.cookie = cookieHeader();
  if (!['GET', 'HEAD'].includes(method) && jar.has('csrf_token')) {
    headers['x-csrf-token'] = jar.get('csrf_token');
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  rememberCookies(res);

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, body: json, text };
};

const section = (title) => console.log(`\n${title}`);

async function main() {
  section('auth + session shape');
  const login = await call('POST', '/api/auth/login', ADMIN);
  check('login as seeded admin returns 200', login.status === 200, `got ${login.status}`);
  check('login sets access + refresh + csrf cookies', jar.has('access_token') && jar.has('refresh_token') && jar.has('csrf_token'));
  check('login payload role is the role name, not an id', login.body?.user?.role === 'ADMIN', JSON.stringify(login.body?.user?.role));

  const me = await call('GET', '/api/auth/me');
  check('/api/auth/me returns 200', me.status === 200, `got ${me.status}`);
  check('/api/auth/me role is a string name', me.body?.role === 'ADMIN', JSON.stringify(me.body?.role));
  check('/api/auth/me carries permissions', Array.isArray(me.body?.permissions) && me.body.permissions.includes('roles.manage'));

  section('stats expose the live role list');
  const stats = await call('GET', '/api/users/stats');
  check('stats returns 200', stats.status === 200, `got ${stats.status}`);
  check('stats.roles is an array', Array.isArray(stats.body?.roles));
  check('stats.roles contains the three system roles', ['ADMIN', 'DEVELOPER', 'USER'].every((r) => stats.body.roles.includes(r)), JSON.stringify(stats.body?.roles));
  check('stats.byRole is keyed by role name', typeof stats.body?.byRole?.ADMIN === 'number');
  check('stats.byRole counts sum to total', Object.values(stats.body.byRole).reduce((a, b) => a + b, 0) === stats.body.total, `${JSON.stringify(stats.body.byRole)} vs ${stats.body.total}`);

  section('list, filter and sort by role name');
  const list = await call('GET', '/api/users?limit=100');
  check('list returns 200', list.status === 200, `got ${list.status}`);
  check('every listed user has a string or null role', list.body.data.every((u) => typeof u.role === 'string' || u.role === null));
  check('no user leaks a raw enum column', list.body.data.every((u) => !('Role' in u)));

  const filtered = await call('GET', '/api/users?role=ADMIN&limit=100');
  check('filter by role name returns only that role', filtered.body.data.length > 0 && filtered.body.data.every((u) => u.role === 'ADMIN'), `${filtered.body.data.length} rows`);

  const unknownFilter = await call('GET', '/api/users?role=NOT_A_ROLE');
  check('filtering by an unknown role yields an empty page, not an error', unknownFilter.status === 200 && unknownFilter.body.data.length === 0, `got ${unknownFilter.status}`);

  const sortedAsc = await call('GET', '/api/users?sortBy=role&order=asc&limit=100');
  const namesAsc = sortedAsc.body.data.map((u) => u.role ?? '');
  check('sortBy=role asc is ordered by role name', sortedAsc.status === 200 && namesAsc.every((n, i) => i === 0 || namesAsc[i - 1] <= n), namesAsc.slice(0, 5).join(','));

  const sortedDesc = await call('GET', '/api/users?sortBy=role&order=desc&limit=100');
  const namesDesc = sortedDesc.body.data.map((u) => u.role ?? '');
  check('sortBy=role desc is ordered by role name', sortedDesc.status === 200 && namesDesc.every((n, i) => i === 0 || namesDesc[i - 1] >= n), namesDesc.slice(0, 5).join(','));

  section('a custom role behaves like a first-class role');
  const roleName = `QA_TEMP_${process.pid}`;
  const created = await call('POST', '/api/roles', {
    name: roleName,
    description: 'temporary role created by the verification suite',
    permissions: ['users.read', 'audit.read'],
  });
  check('creating a custom role returns 201', created.status === 201, `got ${created.status} ${created.text.slice(0, 160)}`);
  const roleId = created.body?.data?.id ?? created.body?.id;
  check('created role echoes its id', typeof roleId === 'string');

  const statsAfterCreate = await call('GET', '/api/users/stats');
  check('the custom role shows up in stats.roles', statsAfterCreate.body.roles.includes(roleName), JSON.stringify(statsAfterCreate.body.roles));
  check('the custom role starts with zero users', statsAfterCreate.body.byRole[roleName] === 0, String(statsAfterCreate.body.byRole[roleName]));

  const newUser = await call('POST', '/api/users', {
    name: 'Role Drop Probe',
    email: `role.probe.${process.pid}@example.com`,
    password: 'Password123!',
    role: roleName,
    status: 'ACTIVE',
  });
  check('creating a user with a custom role returns 201', newUser.status === 201, `got ${newUser.status} ${newUser.text.slice(0, 160)}`);
  const userId = newUser.body?.data?.id ?? newUser.body?.id;
  const createdRole = newUser.body?.data?.role ?? newUser.body?.role;
  check('the created user carries the custom role name', createdRole === roleName, JSON.stringify(createdRole));

  const filteredCustom = await call('GET', `/api/users?role=${encodeURIComponent(roleName)}`);
  check('filtering by the custom role finds that user', filteredCustom.body.data.some((u) => u.id === userId));

  const reassign = await call('PATCH', `/api/users/${userId}`, { role: 'DEVELOPER' });
  const reassigned = reassign.body?.data?.role ?? reassign.body?.role;
  check('reassigning to another role returns 200', reassign.status === 200, `got ${reassign.status}`);
  check('reassignment is reflected in the response', reassigned === 'DEVELOPER', JSON.stringify(reassigned));

  const backAgain = await call('PATCH', `/api/users/${userId}`, { role: roleName });
  const backRole = backAgain.body?.data?.role ?? backAgain.body?.role;
  check('reassigning back to the custom role works', backRole === roleName, JSON.stringify(backRole));

  section('unknown roles are rejected with a useful message');
  const badRole = await call('PATCH', `/api/users/${userId}`, { role: 'GHOST_ROLE' });
  check('an unknown role is a 400, not a 500', badRole.status === 400, `got ${badRole.status}`);
  const detail = badRole.body?.error?.details?.[0]?.message ?? '';
  check('the error lists the roles that do exist', detail.includes('ADMIN') && detail.includes(roleName), detail);

  const badCreate = await call('POST', '/api/users', {
    name: 'Never Created',
    email: `never.${process.pid}@example.com`,
    password: 'Password123!',
    role: 'GHOST_ROLE',
  });
  check('creating with an unknown role is a 400', badCreate.status === 400, `got ${badCreate.status}`);

  section('role deletion guards');
  const deleteInUse = await call('DELETE', `/api/roles/${roleId}`);
  check('deleting a role that is still assigned is a 409', deleteInUse.status === 409, `got ${deleteInUse.status}`);

  const adminRoleId = (await call('GET', '/api/roles')).body.data.find((r) => r.name === 'ADMIN')?.id;
  const deleteSystem = await call('DELETE', `/api/roles/${adminRoleId}`);
  check('deleting a system role is refused', deleteSystem.status === 400, `got ${deleteSystem.status}`);

  section('registration falls back to the default role');
  const registered = await call('POST', '/api/auth/register', {
    name: 'Default Role Probe',
    email: `default.probe.${process.pid}@example.com`,
    password: 'Password123!',
  });
  check('register returns 201', registered.status === 201, `got ${registered.status} ${registered.text.slice(0, 160)}`);
  check('a fresh registration lands on USER', registered.body?.user?.role === 'USER', JSON.stringify(registered.body?.user?.role));
  const registeredId = registered.body?.user?.id;

  section('csrf is still enforced on writes');
  const noCsrf = await fetch(`${BASE}/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', cookie: cookieHeader() },
    body: JSON.stringify({ name: 'No CSRF' }),
  });
  check('a write without the csrf header is refused', noCsrf.status === 403, `got ${noCsrf.status}`);

  section('cleanup');
  const relogin = await call('POST', '/api/auth/login', ADMIN);
  check('re-login as admin after the register rotation', relogin.status === 200, `got ${relogin.status}`);

  if (registeredId) {
    const dropped = await call('DELETE', `/api/users/${registeredId}`);
    check('registered probe user deleted', dropped.status === 204 || dropped.status === 200, `got ${dropped.status}`);
  }
  const droppedUser = await call('DELETE', `/api/users/${userId}`);
  check('probe user deleted', droppedUser.status === 204 || droppedUser.status === 200, `got ${droppedUser.status}`);

  const droppedRole = await call('DELETE', `/api/roles/${roleId}`);
  check('the now-unused custom role can be deleted', droppedRole.status === 204, `got ${droppedRole.status}`);

  const finalStats = await call('GET', '/api/users/stats');
  check('stats no longer lists the deleted role', !finalStats.body.roles.includes(roleName), JSON.stringify(finalStats.body.roles));

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    console.log(`failing: ${failures.join(' | ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('suite crashed:', error);
  process.exitCode = 1;
});
