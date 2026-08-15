const { formatISO, subDays } = require('date-fns');
const prisma = require('../src/lib/prisma');
const { confirm } = require('./prompt');
const { TABLES, findTable, countAll, clearTable, superAdminEmail } = require('./db-tables');

const USAGE = `
  Usage: pnpm run db:clear -- [flags]

  Pick what to remove:
    --table=<key>[,<key>]     clear one or more tables by key
    --all                     clear every table except the catalogue
    --include-catalogue       widen --all to permissions, system roles and the docs pages
    --user=<email|id>         delete a single user
    --users                   delete every user except the super admin
    --older-than=<days>       restrict --table to rows created before N days ago

  Control how it runs:
    --dry-run                 print the row counts and exit without deleting
    --yes                     skip the confirmation prompt
    --list                    print the table keys and their row counts
    --help                    print this message

  Examples:
    pnpm run db:clear -- --list
    pnpm run db:clear -- --table=audit-logs,notifications
    pnpm run db:clear -- --table=audit-logs --older-than=30
    pnpm run db:clear -- --user=ada.lovelace@example.com
    pnpm run db:clear -- --all --dry-run
`;

const parseArgs = (argv) => {
  const flags = {};
  argv.forEach((arg) => {
    if (!arg.startsWith('--')) return;
    const [name, value] = arg.slice(2).split('=');
    flags[name] = value ?? true;
  });
  return flags;
};

const listTables = async () => {
  const rows = await countAll(TABLES);
  console.log('\n  key                  rows  table');
  rows.forEach(({ table, count }) => {
    const suffix = table.catalogue ? '  (catalogue)' : '';
    console.log(`  ${table.key.padEnd(18)} ${String(count).padStart(6)}  ${table.label}${suffix}`);
  });
  console.log('');
};

const resolveTables = (flags) => {
  if (flags.all) {
    return TABLES.filter(
      (table) => table.key !== 'users' && (flags['include-catalogue'] ? true : !table.catalogue),
    );
  }

  if (typeof flags.table !== 'string') return [];

  const keys = flags.table
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  const resolved = keys.map((key) => {
    const table = findTable(key);
    if (!table) throw new Error(`Unknown table key "${key}". Run with --list to see the keys.`);
    return table;
  });
  return resolved;
};

const withCutoff = (table, days) => {
  if (!days) return table;
  if (!table.timeField) {
    throw new Error(`--older-than cannot apply to "${table.key}": it has no timestamp column.`);
  }
  const cutoff = subDays(new Date(), days);
  return {
    ...table,
    label: `${table.label} (before ${formatISO(cutoff, { representation: 'date' })})`,
    where: { ...(table.where ?? {}), [table.timeField]: { lt: cutoff } },
  };
};

const clearTables = async (tables, flags) => {
  const rows = await countAll(tables);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  console.log('\nRows matched:');
  rows.forEach(({ table, count }) => {
    console.log(`   ${String(count).padStart(6)}  ${table.label}`);
  });
  console.log('');

  if (total === 0) {
    console.log('Nothing to delete.\n');
    return;
  }
  if (flags['dry-run']) {
    console.log('Dry run — nothing was deleted.\n');
    return;
  }
  if (!flags.yes && !(await confirm(`Delete these ${total} rows?`))) {
    console.log('\nCancelled. Nothing was changed.\n');
    return;
  }

  let deleted = 0;
  for (const table of tables) {
    const count = await clearTable(table);
    deleted += count;
    console.log(`   deleted ${String(count).padStart(6)}  ${table.label}`);
  }
  console.log(`\nDeleted ${deleted} rows.\n`);
};

const clearOneUser = async (identifier, flags) => {
  const where = identifier.includes('@')
    ? { email: identifier.trim().toLowerCase() }
    : { id: identifier.trim() };

  const user = await prisma.user.findUnique({
    where,
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    console.log(`\nNo user matched "${identifier}".\n`);
    return;
  }
  if (user.email === superAdminEmail()) {
    console.log(`\n${user.email} is the super admin. Refusing to delete it.\n`);
    console.log('Change SUPER_ADMIN_EMAIL in backend/.env first if you really mean to.\n');
    process.exitCode = 1;
    return;
  }

  console.log(`\nMatched: ${user.name} <${user.email}>\n`);
  if (flags['dry-run']) {
    console.log('Dry run — nothing was deleted.\n');
    return;
  }
  if (!flags.yes && !(await confirm(`Delete ${user.email}?`))) {
    console.log('\nCancelled. Nothing was changed.\n');
    return;
  }

  await prisma.user.delete({ where: { id: user.id } });
  console.log(`\nDeleted ${user.email}.\n`);
};

const clearUsers = async (flags) => {
  const email = superAdminEmail();
  const where = email ? { email: { not: email } } : {};
  const count = await prisma.user.count({ where });

  console.log(`\nUsers to delete: ${count}`);
  console.log(
    email
      ? `Keeping the super admin: ${email}\n`
      : 'SUPER_ADMIN_EMAIL is not set — every user matches.\n',
  );

  if (count === 0) {
    console.log('Nothing to delete.\n');
    return;
  }
  if (flags['dry-run']) {
    console.log('Dry run — nothing was deleted.\n');
    return;
  }
  if (!flags.yes && !(await confirm(`Delete ${count} users?`))) {
    console.log('\nCancelled. Nothing was changed.\n');
    return;
  }

  const result = await prisma.user.deleteMany({ where });
  console.log(`\nDeleted ${result.count} users.\n`);
};

const main = async () => {
  const flags = parseArgs(process.argv.slice(2));

  if (flags.help) {
    console.log(USAGE);
    return;
  }
  if (flags.list) {
    await listTables();
    return;
  }

  const days = flags['older-than'] ? Number(flags['older-than']) : 0;
  if (flags['older-than'] && (!Number.isFinite(days) || days <= 0)) {
    throw new Error('--older-than needs a positive number of days.');
  }

  if (typeof flags.user === 'string') {
    await clearOneUser(flags.user, flags);
    return;
  }
  if (flags.users) {
    await clearUsers(flags);
    return;
  }

  const tables = resolveTables(flags);
  if (tables.length === 0) {
    console.log(USAGE);
    console.log('  Nothing selected. Pass --table, --all, --user or --users.\n');
    process.exitCode = 1;
    return;
  }

  await clearTables(
    tables.map((table) => withCutoff(table, days)),
    flags,
  );
};

main()
  .catch((error) => {
    console.error(`\n${error.message ?? error}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
