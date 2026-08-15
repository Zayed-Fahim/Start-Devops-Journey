const BASE = process.env.API_URL ?? 'http://localhost:5000';
const PASSWORD = process.env.SEED_PASSWORD ?? 'Password123!';
const ADMIN = { email: 'ada.lovelace@example.com', password: PASSWORD };
const ADMIN_NAME = 'Ada Lovelace';

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
const remember = (res) =>
  (res.headers.getSetCookie?.() ?? []).forEach((line) => {
    const [pair] = line.split(';');
    const index = pair.indexOf('=');
    const value = pair.slice(index + 1).trim();
    const name = pair.slice(0, index).trim();
    if (!value || value === 'undefined') jar.delete(name);
    else jar.set(name, value);
  });

const call = async (method, path, body) => {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  if (!['GET', 'HEAD'].includes(method) && jar.has('csrf_token')) {
    headers['x-csrf-token'] = jar.get('csrf_token');
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  remember(res);
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed, text };
};

const section = (title) => console.log(`\n${title}`);
const auditFor = async (targetId) => {
  const logs = await call('GET', '/api/audit-logs?limit=100');
  return (logs.body?.data ?? []).filter((entry) => entry.targetId === targetId);
};

async function main() {
  const login = await call('POST', '/api/auth/login', ADMIN);
  check('signed in as admin', login.status === 200, `got ${login.status}`);

  const rolesBefore = await call('GET', '/api/roles');
  const admin = rolesBefore.body.data.find((r) => r.name === 'ADMIN');
  const developer = rolesBefore.body.data.find((r) => r.name === 'DEVELOPER');
  const adminPerms = admin.permissions;
  const devPerms = developer.permissions;

  section('lockout guards still hold after the refactor');
  const selfLockout = await call('PATCH', `/api/roles/${admin.id}`, {
    permissions: adminPerms.filter((key) => key !== 'roles.manage'),
  });
  check(
    'removing roles.manage from your own role is refused',
    selfLockout.status === 400,
    `got ${selfLockout.status}`,
  );
  check(
    'while ADMIN is the only manager the refusal is LAST_ROLE_MANAGER',
    selfLockout.body?.error?.code === 'LAST_ROLE_MANAGER',
    JSON.stringify(selfLockout.body?.error?.code),
  );

  const stillThere = await call('GET', `/api/roles/${admin.id}`);
  check('ADMIN kept roles.manage', stillThere.body.permissions.includes('roles.manage'));
  check(
    'ADMIN permissions are completely unchanged',
    JSON.stringify(stillThere.body.permissions) === JSON.stringify(adminPerms),
    JSON.stringify(stillThere.body.permissions),
  );

  section('the write transaction is atomic with its audit entry');
  const roleName = `GUARD_TEMP_${process.pid}`;
  const created = await call('POST', '/api/roles', {
    name: roleName,
    description: 'temporary role for the guard suite',
    permissions: ['users.read'],
  });
  check(
    'custom role created',
    created.status === 201,
    `got ${created.status} ${created.text.slice(0, 140)}`,
  );
  const roleId = created.body.id;

  const createLogs = await auditFor(roleId);
  check(
    'creating a role wrote exactly one audit entry',
    createLogs.length === 1,
    `${createLogs.length} entries`,
  );
  check(
    'the audit entry is categorised CREATE',
    createLogs[0]?.category === 'CREATE',
    createLogs[0]?.category,
  );
  check(
    'the audit entry names the actor, not System',
    createLogs[0]?.actorLabel === ADMIN_NAME,
    JSON.stringify(createLogs[0]?.actorLabel),
  );
  check(
    'the audit entry labels the target role',
    createLogs[0]?.targetLabel === roleName,
    JSON.stringify(createLogs[0]?.targetLabel),
  );
  check(
    'the audit entry records the client ip',
    Boolean(createLogs[0]?.ip),
    JSON.stringify(createLogs[0]?.ip),
  );

  const patched = await call('PATCH', `/api/roles/${roleId}`, {
    permissions: ['users.read', 'audit.read'],
  });
  check('updating the role returns 200', patched.status === 200, `got ${patched.status}`);
  check(
    'the response carries the new permission set',
    JSON.stringify(patched.body.permissions) === JSON.stringify(['audit.read', 'users.read']),
    JSON.stringify(patched.body.permissions),
  );
  check(
    'the response carries updatedAt',
    typeof patched.body.updatedAt === 'string' && patched.body.updatedAt.length > 0,
    JSON.stringify(patched.body.updatedAt),
  );

  const readBack = await call('GET', `/api/roles/${roleId}`);
  check(
    'a fresh read agrees with the update response',
    JSON.stringify(readBack.body.permissions) === JSON.stringify(patched.body.permissions),
    JSON.stringify(readBack.body.permissions),
  );
  check(
    'updatedAt from the read matches the update response',
    readBack.body.updatedAt === patched.body.updatedAt,
    `${readBack.body.updatedAt} vs ${patched.body.updatedAt}`,
  );

  const updateLogs = await auditFor(roleId);
  check(
    'updating wrote a second audit entry',
    updateLogs.length === 2,
    `${updateLogs.length} entries`,
  );
  check(
    'the update entry is categorised SECURITY',
    updateLogs.some((e) => e.category === 'SECURITY'),
  );
  check(
    'the update entry also names the actor',
    updateLogs.every((e) => e.actorLabel === ADMIN_NAME),
  );

  section('a rejected write leaves no audit entry behind');
  const badPermission = await call('PATCH', `/api/roles/${roleId}`, {
    permissions: ['users.read', 'not.a.permission'],
  });
  check(
    'an unknown permission is a 400',
    badPermission.status === 400,
    `got ${badPermission.status}`,
  );
  check(
    'the error names the unknown key',
    badPermission.text.includes('not.a.permission'),
    badPermission.text.slice(0, 160),
  );

  const afterBad = await auditFor(roleId);
  check(
    'the rejected write wrote no audit entry',
    afterBad.length === 2,
    `${afterBad.length} entries`,
  );
  const unchanged = await call('GET', `/api/roles/${roleId}`);
  check(
    'the rejected write changed no permissions',
    JSON.stringify(unchanged.body.permissions) === JSON.stringify(['audit.read', 'users.read']),
    JSON.stringify(unchanged.body.permissions),
  );

  section('last-role-manager guard');
  const grantManage = await call('PATCH', `/api/roles/${roleId}`, {
    permissions: ['users.read', 'roles.manage'],
  });
  check(
    'a second role can hold roles.manage',
    grantManage.status === 200,
    `got ${grantManage.status}`,
  );

  const nowAllowed = await call('PATCH', `/api/roles/${admin.id}`, {
    permissions: adminPerms.filter((key) => key !== 'roles.manage'),
  });
  check(
    'self-lockout still blocks even with another manager present',
    nowAllowed.status === 400,
    `got ${nowAllowed.status}`,
  );
  check(
    'and it is still SELF_LOCKOUT, not LAST_ROLE_MANAGER',
    nowAllowed.body?.error?.code === 'SELF_LOCKOUT',
    nowAllowed.body?.error?.code,
  );

  const dropManageFromTemp = await call('PATCH', `/api/roles/${roleId}`, {
    permissions: ['users.read'],
  });
  check(
    'a non-acting role can drop roles.manage while ADMIN still has it',
    dropManageFromTemp.status === 200,
    `got ${dropManageFromTemp.status}`,
  );

  section('permission catalogue caching stays correct');
  const catalogue = await call('GET', '/api/roles/permissions');
  check(
    'the catalogue is non-empty',
    catalogue.body.data.length > 0,
    `${catalogue.body.data.length}`,
  );
  const everyKey = catalogue.body.data.map((p) => p.key);
  const grantAll = await call('PATCH', `/api/roles/${roleId}`, { permissions: everyKey });
  check(
    'every catalogued key is accepted',
    grantAll.status === 200,
    `got ${grantAll.status} ${grantAll.text.slice(0, 140)}`,
  );
  check(
    'every catalogued permission is stored',
    grantAll.body.permissions.length === everyKey.length,
    `${grantAll.body.permissions.length} of ${everyKey.length}`,
  );
  const stillRejects = await call('PATCH', `/api/roles/${roleId}`, { permissions: ['ghost.key'] });
  check(
    'an unknown key is still rejected after the cache is warm',
    stillRejects.status === 400,
    `got ${stillRejects.status}`,
  );

  section('cleanup');
  await call('PATCH', `/api/roles/${roleId}`, { permissions: ['users.read'] });
  const dropped = await call('DELETE', `/api/roles/${roleId}`);
  check('temporary role deleted', dropped.status === 204, `got ${dropped.status}`);

  const deleteLogs = await auditFor(roleId);
  check(
    'deleting wrote a DELETE audit entry',
    deleteLogs.some((e) => e.category === 'DELETE'),
  );
  check(
    'the delete entry names the actor',
    deleteLogs.filter((e) => e.category === 'DELETE').every((e) => e.actorLabel === ADMIN_NAME),
  );

  const finalAdmin = await call('GET', `/api/roles/${admin.id}`);
  check(
    'ADMIN survived the whole suite unchanged',
    JSON.stringify(finalAdmin.body.permissions) === JSON.stringify(adminPerms),
    JSON.stringify(finalAdmin.body.permissions),
  );
  const finalDev = await call('GET', `/api/roles/${developer.id}`);
  check(
    'DEVELOPER survived the whole suite unchanged',
    JSON.stringify(finalDev.body.permissions) === JSON.stringify(devPerms),
    JSON.stringify(finalDev.body.permissions),
  );

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
