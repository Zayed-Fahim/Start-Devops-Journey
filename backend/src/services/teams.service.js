const prisma = require('../lib/prisma');

const TEAM_SELECT = Object.freeze({
  id: true,
  name: true,
  description: true,
  leadUserId: true,
  createdAt: true,
  updatedAt: true,
});

const LEAD_SELECT = Object.freeze({ select: { id: true, name: true } });

const MEMBER_USER_SELECT = Object.freeze({
  id: true,
  name: true,
  email: true,
  status: true,
  roleRef: { select: { name: true } },
});

const toTeam = (team) => {
  if (!team) return team;
  const { lead, _count: count, ...rest } = team;
  return {
    ...rest,
    lead: lead ? { id: lead.id, name: lead.name } : null,
    memberCount: count?.members ?? 0,
  };
};

const toMember = (row) => ({
  teamId: row.teamId,
  userId: row.userId,
  joinedAt: row.joinedAt,
  name: row.user.name,
  email: row.user.email,
  status: row.user.status,
  role: row.user.roleRef?.name ?? null,
});

const listTeams = async () => {
  const teams = await prisma.team.findMany({
    select: { ...TEAM_SELECT, lead: LEAD_SELECT, _count: { select: { members: true } } },
    orderBy: { name: 'asc' },
  });
  return teams.map(toTeam);
};

const getTeam = async (id) =>
  toTeam(
    await prisma.team.findUnique({
      where: { id },
      select: { ...TEAM_SELECT, lead: LEAD_SELECT, _count: { select: { members: true } } },
    }),
  );

const listMembers = async (teamId, { page, limit }) => {
  const [total, rows] = await prisma.$transaction([
    prisma.teamMember.count({ where: { teamId } }),
    prisma.teamMember.findMany({
      where: { teamId },
      select: { teamId: true, userId: true, joinedAt: true, user: { select: MEMBER_USER_SELECT } },
      orderBy: [{ user: { name: 'asc' } }, { userId: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data: rows.map(toMember),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

const loadTeamForDelete = async (id) => {
  const [team, memberCount] = await prisma.$transaction([
    prisma.team.findUnique({ where: { id }, select: TEAM_SELECT }),
    prisma.teamMember.count({ where: { teamId: id } }),
  ]);
  return { team, memberCount };
};

const loadMembershipContext = async (teamId, userId) => {
  const [team, user, membership] = await prisma.$transaction([
    prisma.team.findUnique({ where: { id: teamId }, select: TEAM_SELECT }),
    prisma.user.findUnique({
      where: { id: userId },
      select: MEMBER_USER_SELECT,
    }),
    prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { teamId: true, userId: true, joinedAt: true },
    }),
  ]);
  return { team, user, membership };
};

const createTeam = async ({ id, name, description }, auditEntry) => {
  const writes = [
    prisma.team.create({
      data: { id, name, description: description ?? null },
      select: TEAM_SELECT,
    }),
  ];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return { ...results[0], lead: null, memberCount: 0 };
};

const updateTeam = async (id, data, auditEntry) => {
  const writes = [
    prisma.team.update({
      where: { id },
      data,
      select: { ...TEAM_SELECT, lead: LEAD_SELECT, _count: { select: { members: true } } },
    }),
  ];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return toTeam(results[0]);
};

const deleteTeam = async (id, auditEntry) => {
  const writes = [prisma.team.delete({ where: { id }, select: { id: true, name: true } })];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return results[0];
};

const addMember = async (teamId, user, auditEntry) => {
  const writes = [
    prisma.teamMember.create({
      data: { teamId, userId: user.id },
      select: { teamId: true, userId: true, joinedAt: true },
    }),
  ];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return toMember({ ...results[0], user });
};

const removeMember = async (teamId, userId, wasLead, auditEntry) => {
  const writes = [
    prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
      select: { teamId: true, userId: true },
    }),
  ];
  if (wasLead) {
    writes.push(prisma.team.update({ where: { id: teamId }, data: { leadUserId: null } }));
  }
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  await prisma.$transaction(writes);
};

const setLead = async (teamId, userId, auditEntry) => {
  const writes = [
    prisma.team.update({
      where: { id: teamId },
      data: { leadUserId: userId },
      select: { ...TEAM_SELECT, lead: LEAD_SELECT, _count: { select: { members: true } } },
    }),
  ];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return toTeam(results[0]);
};

module.exports = {
  listTeams,
  getTeam,
  listMembers,
  loadTeamForDelete,
  loadMembershipContext,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  setLead,
};
