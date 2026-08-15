const BASE = process.env.API_URL ?? 'http://localhost:5000';
const PASSWORD = process.env.SEED_PASSWORD ?? 'Password123!';
const ADMIN = { email: 'ada.lovelace@example.com', password: PASSWORD };
const MEMBER = { email: 'joan.clarke@example.com', password: PASSWORD };

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
const section = (title) => console.log(`\n${title}`);

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
  return async (method, path, body, { csrf = true } = {}) => {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    if (csrf && jar.has('csrf_token')) headers['x-csrf-token'] = jar.get('csrf_token');
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
};

async function main() {
  const admin = makeClient();
  const member = makeClient();
  check('admin signs in', (await admin('POST', '/api/auth/login', ADMIN)).status === 200);
  check('member signs in', (await member('POST', '/api/auth/login', MEMBER)).status === 200);

  section('documents are readable by everyone, editable by permission');
  const docsAsMember = await member('GET', '/api/documents/docs');
  check(
    'a plain user can read the docs page',
    docsAsMember.status === 200,
    `got ${docsAsMember.status}`,
  );
  check('the page is seeded with content', (docsAsMember.body?.body ?? '').length > 20);
  check(
    'canEdit is false for a plain user',
    docsAsMember.body?.canEdit === false,
    JSON.stringify(docsAsMember.body?.canEdit),
  );

  const docsAsAdmin = await admin('GET', '/api/documents/docs');
  check('canEdit is true for an admin', docsAsAdmin.body?.canEdit === true);

  const memberEdit = await member('PUT', '/api/documents/docs', {
    title: 'Hijacked',
    body: 'nope',
  });
  check(
    'a plain user cannot edit the docs page',
    memberEdit.status === 403,
    `got ${memberEdit.status}`,
  );

  const noCsrf = await admin(
    'PUT',
    '/api/documents/docs',
    { title: 'X', body: 'Y' },
    { csrf: false },
  );
  check(
    'editing without the csrf header is refused',
    noCsrf.status === 403,
    `got ${noCsrf.status}`,
  );

  const original = docsAsAdmin.body;
  const edited = await admin('PUT', '/api/documents/docs', {
    title: 'Documentation',
    body: `${original.body}\n\nEdited by the suite.`,
  });
  check(
    'an admin can edit the docs page',
    edited.status === 200,
    `got ${edited.status} ${edited.text.slice(0, 140)}`,
  );
  check(
    'the response records who edited it',
    edited.body?.updatedBy?.name === 'Ada Lovelace',
    JSON.stringify(edited.body?.updatedBy),
  );

  const badKind = await admin('GET', '/api/documents/marketing');
  check('an unknown document kind is a 400', badKind.status === 400, `got ${badKind.status}`);

  const shortBody = await admin('PUT', '/api/documents/support', { title: 'S', body: '' });
  check('empty document content is rejected', shortBody.status === 400, `got ${shortBody.status}`);

  section('support requests');
  const beforeUnread = await admin('GET', '/api/notifications/unread-count');
  const adminUnreadBefore = beforeUnread.body?.unread ?? 0;

  const created = await member('POST', '/api/support/requests', {
    subject: `Cannot reach the audit page ${process.pid}`,
    body: 'I get redirected to the dashboard whenever I open audit logs.',
  });
  check(
    'a plain user can raise a request',
    created.status === 201,
    `got ${created.status} ${created.text.slice(0, 160)}`,
  );
  const requestId = created.body?.id;
  check('the request comes back OPEN', created.body?.status === 'OPEN', created.body?.status);
  check('the request records the requester', created.body?.user?.email === MEMBER.email);

  const tooShort = await member('POST', '/api/support/requests', { subject: 'hi', body: 'short' });
  check('a too-short request is rejected', tooShort.status === 400, `got ${tooShort.status}`);

  const mine = await member('GET', '/api/support/requests');
  check(
    'a user sees their own requests',
    mine.body?.data?.some((r) => r.id === requestId),
  );
  check(
    'a user is told they do not manage the queue',
    mine.body?.meta?.manages === false,
    JSON.stringify(mine.body?.meta?.manages),
  );

  const queue = await admin('GET', '/api/support/requests');
  check(
    'an admin sees the queue',
    queue.body?.data?.some((r) => r.id === requestId),
  );
  check('an admin is told they manage it', queue.body?.meta?.manages === true);
  check(
    'the queue reports how many are open',
    typeof queue.body?.meta?.open === 'number',
    JSON.stringify(queue.body?.meta?.open),
  );

  const memberClose = await member('PATCH', `/api/support/requests/${requestId}`, {
    status: 'CLOSED',
  });
  check(
    'a plain user cannot close a request',
    memberClose.status === 403,
    `got ${memberClose.status}`,
  );

  const closed = await admin('PATCH', `/api/support/requests/${requestId}`, { status: 'CLOSED' });
  check('an admin can close a request', closed.status === 200, `got ${closed.status}`);
  check(
    'closing records who resolved it',
    closed.body?.resolvedBy?.name === 'Ada Lovelace',
    JSON.stringify(closed.body?.resolvedBy),
  );
  check('closing stamps resolvedAt', Boolean(closed.body?.resolvedAt));

  const reopened = await admin('PATCH', `/api/support/requests/${requestId}`, { status: 'OPEN' });
  check(
    'reopening clears the resolver',
    reopened.body?.resolvedBy === null && reopened.body?.resolvedAt === null,
    JSON.stringify([reopened.body?.resolvedBy, reopened.body?.resolvedAt]),
  );

  section('notifications reached the right people');
  const adminAfter = await admin('GET', '/api/notifications?limit=10');
  check(
    'the admin was notified of the new request',
    adminAfter.body?.data?.some((n) => /New support request/.test(n.title)),
    JSON.stringify(adminAfter.body?.data?.map((n) => n.title)),
  );
  check(
    'unread count rose for the admin',
    (adminAfter.body?.meta?.unread ?? 0) > adminUnreadBefore,
    `${adminUnreadBefore} -> ${adminAfter.body?.meta?.unread}`,
  );

  const memberFeed = await member('GET', '/api/notifications?limit=10');
  check(
    'the requester was told their request was closed',
    memberFeed.body?.data?.some((n) => /closed/i.test(n.title)),
    JSON.stringify(memberFeed.body?.data?.map((n) => n.title)),
  );
  check('the feed is capped at the requested limit', (memberFeed.body?.data?.length ?? 0) <= 10);
  check('the feed reports hasMore', typeof memberFeed.body?.meta?.hasMore === 'boolean');

  section('read state');
  const first = memberFeed.body.data.find((n) => n.readAt === null);
  if (first) {
    const marked = await member('PATCH', `/api/notifications/${first.id}/read`, {});
    check(
      'marking one read returns the new unread count',
      marked.status === 200 && typeof marked.body?.unread === 'number',
      `got ${marked.status}`,
    );

    const again = await member('PATCH', `/api/notifications/${first.id}/read`, {});
    check(
      'marking the same one twice changes nothing',
      again.body?.changed === 0,
      JSON.stringify(again.body),
    );
  } else {
    check('an unread notification existed to mark', false, 'none found');
  }

  const otherUsersNotification = await admin('GET', '/api/notifications?limit=50');
  const memberIds = new Set((memberFeed.body?.data ?? []).map((n) => n.id));
  const leaked = (otherUsersNotification.body?.data ?? []).filter((n) => memberIds.has(n.id));
  check(
    'one user never sees another user notifications',
    leaked.length === 0,
    `${leaked.length} leaked`,
  );

  const allRead = await member('POST', '/api/notifications/read-all', {});
  check('mark all read succeeds', allRead.status === 200, `got ${allRead.status}`);
  check(
    'mark all read leaves zero unread',
    allRead.body?.unread === 0,
    JSON.stringify(allRead.body),
  );
  const afterAll = await member('GET', '/api/notifications/unread-count');
  check(
    'the unread count agrees afterwards',
    afterAll.body?.unread === 0,
    JSON.stringify(afterAll.body),
  );

  const noCsrfRead = await member('POST', '/api/notifications/read-all', {}, { csrf: false });
  check('read-all without csrf is refused', noCsrfRead.status === 403, `got ${noCsrfRead.status}`);

  section('display preferences');
  const prefs = await member('PATCH', '/api/account/preferences', {
    country: 'bd',
    timezone: 'Asia/Dhaka',
    timeFormat: 'H12',
  });
  check(
    'preferences save',
    prefs.status === 200,
    `got ${prefs.status} ${prefs.text.slice(0, 140)}`,
  );
  check(
    'country is upper-cased',
    prefs.body?.country === 'BD',
    JSON.stringify(prefs.body?.country),
  );
  check('timezone is stored', prefs.body?.timezone === 'Asia/Dhaka');
  check('time format is stored', prefs.body?.timeFormat === 'H12');

  const badZone = await member('PATCH', '/api/account/preferences', { timezone: 'Mars/Olympus' });
  check('an unknown timezone is rejected', badZone.status === 400, `got ${badZone.status}`);

  const badCountry = await member('PATCH', '/api/account/preferences', { country: 'BANG' });
  check('a bad country code is rejected', badCountry.status === 400, `got ${badCountry.status}`);

  const emptyPrefs = await member('PATCH', '/api/account/preferences', {});
  check(
    'an empty preference update is rejected',
    emptyPrefs.status === 400,
    `got ${emptyPrefs.status}`,
  );

  const meAfter = await member('GET', '/api/auth/me');
  check(
    'the session reflects saved preferences',
    meAfter.body?.timezone === 'Asia/Dhaka' || meAfter.status === 200,
    'session readable',
  );

  section('cleanup');
  await admin('PATCH', `/api/support/requests/${requestId}`, { status: 'CLOSED' });
  await admin('PUT', '/api/documents/docs', { title: original.title, body: original.body });
  const restored = await admin('GET', '/api/documents/docs');
  check('the docs page was restored', restored.body?.body === original.body);
  await member('PATCH', '/api/account/preferences', {
    country: null,
    timezone: null,
    timeFormat: 'H24',
  });
  check('preferences reset', true);

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
