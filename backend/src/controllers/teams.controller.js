const crypto = require('crypto');
const teams = require('../services/teams.service');
const audit = require('../services/audit.service');
const notifications = require('../services/notifications.service');
const { notFound, conflict, badRequest } = require('../lib/httpError');
const { parseOrThrow } = require('../validation/users.validation');
const {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
  memberParamSchema,
  addMemberSchema,
  setLeadSchema,
  listMembersQuerySchema,
} = require('../validation/teams.validation');

const requestContext = (req) => ({
  userAgent: req.get('user-agent') ?? undefined,
  ip: req.ip ?? undefined,
});

const duplicateName = (name) =>
  conflict(`A team named ${name} already exists`, [
    { field: 'name', message: 'This team name is already taken' },
  ]);

const listTeams = async (_req, res) => {
  res.status(200).json({ data: await teams.listTeams() });
};

const getTeam = async (req, res) => {
  const { id } = parseOrThrow(teamIdParamSchema, req.params, 'Invalid team id');
  const team = await teams.getTeam(id);
  if (!team) throw notFound(`No team found with id ${id}`);
  res.status(200).json(team);
};

const listMembers = async (req, res) => {
  const { id } = parseOrThrow(teamIdParamSchema, req.params, 'Invalid team id');
  const query = parseOrThrow(listMembersQuerySchema, req.query, 'Invalid query parameters');

  const team = await teams.getTeam(id);
  if (!team) throw notFound(`No team found with id ${id}`);

  res.status(200).json(await teams.listMembers(id, query));
};

const createTeam = async (req, res) => {
  const data = parseOrThrow(createTeamSchema, req.body, 'Invalid request body');
  const id = crypto.randomUUID();

  const entry = audit.buildEntry({
    actor: req.user,
    action: audit.AUDIT_ACTIONS.TEAM_CREATED,
    category: 'CREATE',
    summary: `created team ${data.name}`,
    target: { type: 'team', id, label: data.name },
    context: requestContext(req),
  });

  try {
    const team = await teams.createTeam({ ...data, id }, entry);
    res.status(201).location(`/api/teams/${team.id}`).json(team);
  } catch (error) {
    if (error?.code === 'P2002') throw duplicateName(data.name);
    throw error;
  }
};

const updateTeam = async (req, res) => {
  const { id } = parseOrThrow(teamIdParamSchema, req.params, 'Invalid team id');
  const data = parseOrThrow(updateTeamSchema, req.body, 'Invalid request body');

  const existing = await teams.getTeam(id);
  if (!existing) throw notFound(`No team found with id ${id}`);

  const entry = audit.buildEntry({
    actor: req.user,
    action: audit.AUDIT_ACTIONS.TEAM_UPDATED,
    category: 'UPDATE',
    summary: `updated team ${data.name ?? existing.name}`,
    target: { type: 'team', id, label: data.name ?? existing.name },
    context: requestContext(req),
  });

  try {
    res.status(200).json(await teams.updateTeam(id, data, entry));
  } catch (error) {
    if (error?.code === 'P2002') throw duplicateName(data.name);
    throw error;
  }
};

const deleteTeam = async (req, res) => {
  const { id } = parseOrThrow(teamIdParamSchema, req.params, 'Invalid team id');

  const { team, memberCount } = await teams.loadTeamForDelete(id);
  if (!team) throw notFound(`No team found with id ${id}`);
  if (memberCount > 0) {
    throw conflict(`This team still has ${memberCount} member(s). Remove them first.`);
  }

  await teams.deleteTeam(
    id,
    audit.buildEntry({
      actor: req.user,
      action: audit.AUDIT_ACTIONS.TEAM_DELETED,
      category: 'DELETE',
      summary: `deleted team ${team.name}`,
      target: { type: 'team', id, label: team.name },
      context: requestContext(req),
    }),
  );

  res.status(204).end();
};

const addMember = async (req, res) => {
  const { id } = parseOrThrow(teamIdParamSchema, req.params, 'Invalid team id');
  const { userId } = parseOrThrow(addMemberSchema, req.body, 'Invalid request body');

  const { team, user, membership } = await teams.loadMembershipContext(id, userId);
  if (!team) throw notFound(`No team found with id ${id}`);
  if (!user) throw notFound(`No user found with id ${userId}`);
  if (membership) throw conflict(`${user.name} is already a member of ${team.name}`);

  const member = await teams.addMember(
    id,
    user,
    audit.buildEntry({
      actor: req.user,
      action: audit.AUDIT_ACTIONS.TEAM_MEMBER_ADDED,
      category: 'UPDATE',
      summary: `added ${user.name} to team ${team.name}`,
      target: { type: 'team', id, label: team.name },
      context: requestContext(req),
    }),
  );

  if (user.id !== req.user.id) {
    await notifications.notify({
      userId: user.id,
      title: `You were added to ${team.name}`,
      body: `${req.user.name ?? 'An administrator'} added you to the team.`,
      href: '/teams',
      category: 'UPDATE',
    });
  }

  res.status(201).json(member);
};

const removeMember = async (req, res) => {
  const { id, userId } = parseOrThrow(memberParamSchema, req.params, 'Invalid team or user id');

  const { team, user, membership } = await teams.loadMembershipContext(id, userId);
  if (!team) throw notFound(`No team found with id ${id}`);
  if (!membership) throw notFound('That user is not a member of this team');

  const label = user?.name ?? userId;
  const wasLead = team.leadUserId === userId;

  await teams.removeMember(
    id,
    userId,
    wasLead,
    audit.buildEntry({
      actor: req.user,
      action: audit.AUDIT_ACTIONS.TEAM_MEMBER_REMOVED,
      category: 'UPDATE',
      summary: wasLead
        ? `removed team lead ${label} from team ${team.name}`
        : `removed ${label} from team ${team.name}`,
      target: { type: 'team', id, label: team.name },
      context: requestContext(req),
    }),
  );

  if (user && user.id !== req.user.id) {
    await notifications.notify({
      userId: user.id,
      title: `You were removed from ${team.name}`,
      body: `${req.user.name ?? 'An administrator'} removed you from the team.`,
      href: '/teams',
      category: 'UPDATE',
    });
  }

  res.status(204).end();
};

const setLead = async (req, res) => {
  const { id } = parseOrThrow(teamIdParamSchema, req.params, 'Invalid team id');
  const { userId } = parseOrThrow(setLeadSchema, req.body, 'Invalid request body');

  if (userId === null) {
    const existing = await teams.getTeam(id);
    if (!existing) throw notFound(`No team found with id ${id}`);

    const cleared = await teams.setLead(
      id,
      null,
      audit.buildEntry({
        actor: req.user,
        action: audit.AUDIT_ACTIONS.TEAM_LEAD_CHANGED,
        category: 'UPDATE',
        summary: `cleared the lead of team ${existing.name}`,
        target: { type: 'team', id, label: existing.name },
        context: requestContext(req),
      }),
    );
    res.status(200).json(cleared);
    return;
  }

  const { team, user, membership } = await teams.loadMembershipContext(id, userId);
  if (!team) throw notFound(`No team found with id ${id}`);
  if (!user) throw notFound(`No user found with id ${userId}`);
  if (!membership) {
    throw badRequest('The team lead must be a member of the team', [
      { field: 'userId', message: `${user.name} is not a member of ${team.name}` },
    ]);
  }

  const updated = await teams.setLead(
    id,
    userId,
    audit.buildEntry({
      actor: req.user,
      action: audit.AUDIT_ACTIONS.TEAM_LEAD_CHANGED,
      category: 'UPDATE',
      summary: `made ${user.name} the lead of team ${team.name}`,
      target: { type: 'team', id, label: team.name },
      context: requestContext(req),
    }),
  );

  res.status(200).json(updated);
};

module.exports = {
  listTeams,
  getTeam,
  listMembers,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  setLead,
};
