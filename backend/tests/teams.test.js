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
    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (!value || value === 'undefined') jar.delete(name);
    else jar.set(name, value);
  });

const call = async (method, path, body, { csrf = true } = {}) => {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  if (csrf && !['GET', 'HEAD'].includes(method) && jar.has('csrf_token')) {
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

async function main() {
  const login = await call('POST', '/api/auth/login', ADMIN);
  check('signed in as admin', login.status === 200, `got ${login.status}`);

  const users = (await call('GET', '/api/users?limit=100')).body.data;
  const alice = users.find((u) => u.email === 'grace.hopper@example.com');
  const bob = users.find((u) => u.email === 'linus.torvalds@example.com');
  const carol = users.find((u) => u.email === 'ken.thompson@example.com');
  check('picked three seeded users', Boolean(alice && bob && carol));

  section('team creation returns a complete list row');
  const name = `Platform_${process.pid}`;
  const created = await call('POST', '/api/teams', { name, description: 'Owns the platform' });
  check(
    'create returns 201',
    created.status === 201,
    `got ${created.status} ${created.text.slice(0, 160)}`,
  );
  const teamId = created.body?.id;
  check(
    'response carries memberCount 0, not undefined',
    created.body?.memberCount === 0,
    JSON.stringify(created.body?.memberCount),
  );
  check(
    'response carries lead null, not undefined',
    created.body?.lead === null,
    JSON.stringify(created.body?.lead),
  );
  check(
    'response carries name and description',
    created.body?.name === name && created.body?.description === 'Owns the platform',
  );

  const dupe = await call('POST', '/api/teams', { name });
  check('duplicate team name is a 409', dupe.status === 409, `got ${dupe.status}`);
  check(
    'the duplicate message mentions a team, not a user',
    /team/i.test(dupe.body?.error?.message ?? '') && !/user/i.test(dupe.body?.error?.message ?? ''),
    JSON.stringify(dupe.body?.error?.message),
  );

  section('validation');
  const blank = await call('POST', '/api/teams', { name: '   ' });
  check('a whitespace-only name is rejected', blank.status === 400, `got ${blank.status}`);
  const unknownKey = await call('POST', '/api/teams', {
    name: `Strict_${process.pid}`,
    isSystem: true,
  });
  check(
    'an unknown body key is rejected by .strict()',
    unknownKey.status === 400,
    `got ${unknownKey.status}`,
  );
  const badId = await call('GET', '/api/teams/not-a-uuid');
  check('a non-uuid team id is a 400', badId.status === 400, `got ${badId.status}`);

  section('csrf is enforced on every mutating team route');
  const noCsrf = await call(
    'POST',
    '/api/teams',
    { name: `NoCsrf_${process.pid}` },
    { csrf: false },
  );
  check('create without the csrf header is refused', noCsrf.status === 403, `got ${noCsrf.status}`);
  const noCsrfPatch = await call(
    'PATCH',
    `/api/teams/${teamId}`,
    { description: 'x' },
    { csrf: false },
  );
  check(
    'update without the csrf header is refused',
    noCsrfPatch.status === 403,
    `got ${noCsrfPatch.status}`,
  );
  const noCsrfDelete = await call('DELETE', `/api/teams/${teamId}`, undefined, { csrf: false });
  check(
    'delete without the csrf header is refused',
    noCsrfDelete.status === 403,
    `got ${noCsrfDelete.status}`,
  );

  section('membership');
  const added = await call('POST', `/api/teams/${teamId}/members`, { userId: alice.id });
  check(
    'adding a member returns 201',
    added.status === 201,
    `got ${added.status} ${added.text.slice(0, 160)}`,
  );
  check(
    'the member row carries the user name',
    added.body?.name === alice.name,
    JSON.stringify(added.body?.name),
  );
  check(
    'the member row carries email, status and role',
    Boolean(added.body?.email) && Boolean(added.body?.status) && added.body?.role !== undefined,
    JSON.stringify(added.body),
  );

  const addedAgain = await call('POST', `/api/teams/${teamId}/members`, { userId: alice.id });
  check(
    'adding the same member twice is a 409',
    addedAgain.status === 409,
    `got ${addedAgain.status}`,
  );
  check(
    'the conflict names the person, not a database column',
    /grace/i.test(addedAgain.body?.error?.message ?? ''),
    JSON.stringify(addedAgain.body?.error?.message),
  );

  const ghost = await call('POST', `/api/teams/${teamId}/members`, {
    userId: '00000000-0000-0000-0000-000000000000',
  });
  check(
    'adding a non-existent user is a 404, not a 500',
    ghost.status === 404,
    `got ${ghost.status}`,
  );

  await call('POST', `/api/teams/${teamId}/members`, { userId: bob.id });
  const listed = await call('GET', `/api/teams/${teamId}/members`);
  check('member list returns 200', listed.status === 200, `got ${listed.status}`);
  check(
    'member list is paginated with meta',
    typeof listed.body?.meta?.total === 'number' && listed.body.meta.total === 2,
    JSON.stringify(listed.body?.meta),
  );
  check(
    'member list is sorted by name',
    listed.body.data[0].name.localeCompare(listed.body.data[1].name) <= 0,
    listed.body.data.map((m) => m.name).join(','),
  );

  const afterAdds = (await call('GET', '/api/teams')).body.data.find((t) => t.id === teamId);
  check(
    'the list view memberCount tracks membership',
    afterAdds?.memberCount === 2,
    JSON.stringify(afterAdds?.memberCount),
  );

  section('lead');
  const notMember = await call('PATCH', `/api/teams/${teamId}/lead`, { userId: carol.id });
  check('a non-member cannot be made lead', notMember.status === 400, `got ${notMember.status}`);
  check('the refusal explains why', /member/i.test(notMember.text), notMember.text.slice(0, 140));

  const led = await call('PATCH', `/api/teams/${teamId}/lead`, { userId: alice.id });
  check('setting the lead returns 200', led.status === 200, `got ${led.status}`);
  check(
    'the response carries the lead summary',
    led.body?.lead?.id === alice.id && led.body?.lead?.name === alice.name,
    JSON.stringify(led.body?.lead),
  );
  check(
    'the response keeps memberCount',
    led.body?.memberCount === 2,
    JSON.stringify(led.body?.memberCount),
  );

  const moved = await call('PATCH', `/api/teams/${teamId}/lead`, { userId: bob.id });
  check(
    'moving the lead to another member works',
    moved.status === 200 && moved.body?.lead?.id === bob.id,
    `${moved.status} ${JSON.stringify(moved.body?.lead)}`,
  );

  const listedLead = (await call('GET', '/api/teams')).body.data.find((t) => t.id === teamId);
  check(
    'the list view shows the lead',
    listedLead?.lead?.name === bob.name,
    JSON.stringify(listedLead?.lead),
  );

  section('removing the lead clears the team lead');
  const removedLead = await call('DELETE', `/api/teams/${teamId}/members/${bob.id}`);
  check('removing a member returns 204', removedLead.status === 204, `got ${removedLead.status}`);
  const afterRemoval = await call('GET', `/api/teams/${teamId}`);
  check(
    'the team no longer points at the removed lead',
    afterRemoval.body?.lead === null,
    JSON.stringify(afterRemoval.body?.lead),
  );
  check(
    'memberCount dropped to 1',
    afterRemoval.body?.memberCount === 1,
    JSON.stringify(afterRemoval.body?.memberCount),
  );

  const removeAgain = await call('DELETE', `/api/teams/${teamId}/members/${bob.id}`);
  check('removing a non-member is a 404', removeAgain.status === 404, `got ${removeAgain.status}`);

  section('deletion is refused while the team still has members');
  const blocked = await call('DELETE', `/api/teams/${teamId}`);
  check('deleting a non-empty team is a 409', blocked.status === 409, `got ${blocked.status}`);
  check(
    'the refusal states the member count',
    /1 member/i.test(blocked.body?.error?.message ?? ''),
    JSON.stringify(blocked.body?.error?.message),
  );

  section('audit trail');
  const logs = (await call('GET', '/api/audit-logs?limit=100')).body.data.filter(
    (e) => e.targetId === teamId,
  );
  const actions = logs.map((e) => e.action);
  ['team.created', 'team.member_added', 'team.member_removed', 'team.lead_changed'].forEach(
    (action) => {
      check(`audit recorded ${action}`, actions.includes(action), actions.join(','));
    },
  );
  check(
    'every team audit entry names the actor',
    logs.every((e) => e.actorLabel === ADMIN_NAME),
    JSON.stringify([...new Set(logs.map((e) => e.actorLabel))]),
  );

  section('cleanup');
  await call('DELETE', `/api/teams/${teamId}/members/${alice.id}`);
  const deleted = await call('DELETE', `/api/teams/${teamId}`);
  check('an empty team can be deleted', deleted.status === 204, `got ${deleted.status}`);
  const gone = await call('GET', `/api/teams/${teamId}`);
  check('the team is gone', gone.status === 404, `got ${gone.status}`);

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
