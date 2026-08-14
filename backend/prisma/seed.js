const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const env = require('../src/lib/env');

const PASSWORD = 'Password123!';
const day = (iso) => new Date(`${iso}T09:00:00.000Z`);
const USERS = [
  {
    name: 'Ada Lovelace',
    email: 'ada.lovelace@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: day('2026-01-06'),
  },
  {
    name: 'Grace Hopper',
    email: 'grace.hopper@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: day('2026-01-14'),
  },
  {
    name: 'Alan Turing',
    email: 'alan.turing@example.com',
    role: 'ADMIN',
    status: 'INACTIVE',
    createdAt: day('2026-01-22'),
  },
  {
    name: 'Linus Torvalds',
    email: 'linus.torvalds@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-02-03'),
  },
  {
    name: 'Margaret Hamilton',
    email: 'margaret.hamilton@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-02-11'),
  },
  {
    name: 'Ken Thompson',
    email: 'ken.thompson@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-02-19'),
  },
  {
    name: 'Barbara Liskov',
    email: 'barbara.liskov@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-02-27'),
  },
  {
    name: 'Dennis Ritchie',
    email: 'dennis.ritchie@example.com',
    role: 'DEVELOPER',
    status: 'INACTIVE',
    createdAt: day('2026-03-05'),
  },
  {
    name: 'Katherine Johnson',
    email: 'katherine.johnson@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-03-13'),
  },
  {
    name: 'Guido van Rossum',
    email: 'guido.vanrossum@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-03-21'),
  },
  {
    name: 'Radia Perlman',
    email: 'radia.perlman@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-03-29'),
  },
  {
    name: 'Brian Kernighan',
    email: 'brian.kernighan@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-04-06'),
  },
  {
    name: 'Frances Allen',
    email: 'frances.allen@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-04-14'),
  },
  {
    name: 'Bjarne Stroustrup',
    email: 'bjarne.stroustrup@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-04-22'),
  },
  {
    name: 'Shafi Goldwasser',
    email: 'shafi.goldwasser@example.com',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    createdAt: day('2026-04-30'),
  },
  {
    name: 'Tim Berners-Lee',
    email: 'tim.berners-lee@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: day('2026-05-08'),
  },
  {
    name: 'Anita Borg',
    email: 'anita.borg@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: day('2026-05-16'),
  },
  {
    name: 'Vint Cerf',
    email: 'vint.cerf@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: day('2026-05-24'),
  },
  {
    name: 'Jean Bartik',
    email: 'jean.bartik@example.com',
    role: 'USER',
    status: 'INACTIVE',
    createdAt: day('2026-06-01'),
  },
  {
    name: 'Donald Knuth',
    email: 'donald.knuth@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: day('2026-06-09'),
  },
  {
    name: 'Carol Shaw',
    email: 'carol.shaw@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: day('2026-06-17'),
  },
  {
    name: 'Edsger Dijkstra',
    email: 'edsger.dijkstra@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: day('2026-06-25'),
  },
  {
    name: 'Sophie Wilson',
    email: 'sophie.wilson@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: day('2026-07-03'),
  },
  {
    name: 'James Gosling',
    email: 'james.gosling@example.com',
    role: 'USER',
    status: 'INACTIVE',
    createdAt: day('2026-07-11'),
  },
  {
    name: 'Joan Clarke',
    email: 'joan.clarke@example.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: day('2026-07-19'),
  },
];
async function main() {
  console.log(`Seeding ${USERS.length} users…`);
  const password = await bcrypt.hash(PASSWORD, env.BCRYPT_ROUNDS);
  let created = 0;
  let updated = 0;
  for (const user of USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        status: user.status,
      },
      create: { ...user, password },
    });
    if (existing) updated += 1;
    else created += 1;
  }
  const [total, byRole, byStatus] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  console.log(`\n  created: ${created}   updated: ${updated}`);
  console.log(`  total users in database: ${total}`);
  console.log(`  by role:   ${byRole.map((r) => `${r.role}=${r._count._all}`).join('  ')}`);
  console.log(`  by status: ${byStatus.map((s) => `${s.status}=${s._count._all}`).join('  ')}`);
  console.log(`\n  every seeded user's password is: ${PASSWORD}\n`);
}
main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
