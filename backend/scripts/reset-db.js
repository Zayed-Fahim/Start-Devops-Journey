const prisma = require('../src/lib/prisma');
const { confirm } = require('./prompt');
const { TABLES, countAll, clearTable, superAdminEmail, findSuperAdmin } = require('./db-tables');

const TRANSACTIONAL = TABLES.filter((table) => table.transactional);

const printPlan = (rows, heading) => {
  console.log(`\n${heading}`);
  rows.forEach(({ table, count }) => {
    console.log(`   ${String(count).padStart(6)}  ${table.label}`);
  });
  console.log('');
};

const resetTransactional = async () => {
  const rows = await countAll(TRANSACTIONAL);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  printPlan(rows, 'Rows that will be deleted:');

  if (total === 0) {
    console.log('Nothing to delete — these tables are already empty.\n');
    return true;
  }

  console.log(
    'Preserved either way: users, permissions, system roles, and the docs/support pages.',
  );
  console.log('Those are created by migrations, and migrations only run forward — deleting them');
  console.log(
    'would leave the app unusable with no way to restore them short of a new migration.\n',
  );

  const ok = await confirm('Reset all the database data from all tables?');
  if (!ok) {
    console.log('\nCancelled. Nothing was changed.\n');
    return false;
  }

  let deleted = 0;
  for (const table of TRANSACTIONAL) {
    const count = await clearTable(table);
    deleted += count;
    console.log(`   deleted ${String(count).padStart(6)}  ${table.label}`);
  }
  console.log(`\nDeleted ${deleted} rows.\n`);
  return true;
};

const resetUsers = async () => {
  const email = superAdminEmail();
  const superAdmin = email ? await findSuperAdmin() : null;

  const total = await prisma.user.count();
  const removable = email ? await prisma.user.count({ where: { email: { not: email } } }) : total;

  console.log(`\nUsers in the database: ${total}`);

  if (!email) {
    console.log('\nSUPER_ADMIN_EMAIL is not set, so there is no account to keep.');
    console.log('Set it in backend/.env before running this, or every user will be deleted.\n');
  } else if (!superAdmin) {
    console.log(`\nSUPER_ADMIN_EMAIL is ${email}, but no user with that address exists yet.`);
    console.log('It will be recreated from the environment the next time the server boots.\n');
  } else {
    console.log(`Keeping the super admin: ${superAdmin.name} <${superAdmin.email}>`);
    console.log(`Deleting the other ${removable} user${removable === 1 ? '' : 's'}.\n`);
  }

  if (removable === 0) {
    console.log('No users to delete.\n');
    return;
  }

  const ok = await confirm('Remove all the users from the database as well?');
  if (!ok) {
    console.log('\nUsers were left alone.\n');
    return;
  }

  const result = await prisma.user.deleteMany(email ? { where: { email: { not: email } } } : {});
  console.log(`\nDeleted ${result.count} user${result.count === 1 ? '' : 's'}.\n`);
};

const main = async () => {
  console.log('\n  DATABASE RESET');
  console.log('  Take a backup first — this cannot be undone.');

  const proceeded = await resetTransactional();
  if (!proceeded) return;

  await resetUsers();
  console.log('Done.\n');
};

main()
  .catch((error) => {
    console.error('\nReset failed:', error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
