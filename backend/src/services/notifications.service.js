const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const NOTIFICATION_SELECT = Object.freeze({
  id: true,
  title: true,
  body: true,
  href: true,
  category: true,
  readAt: true,
  createdAt: true,
});

const buildEntry = ({ userId, title, body, href, category = 'UPDATE' }) => ({
  userId,
  title: title.slice(0, 160),
  body: body ? body.slice(0, 500) : null,
  href: href ? href.slice(0, 255) : null,
  category,
});

const recipientsWithPermission = async (key, { exclude } = {}) => {
  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      ...(exclude ? { id: { not: exclude } } : {}),
      roleRef: { permissions: { some: { permission: { key } } } },
    },
    select: { id: true },
  });
  return users.map((user) => user.id);
};

const notify = async (input) => {
  try {
    await prisma.notification.create({ data: buildEntry(input), select: { id: true } });
  } catch (error) {
    logger.error({ err: error, userId: input.userId }, 'failed to write notification');
  }
};

const notifyMany = async (userIds, input) => {
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => buildEntry({ ...input, userId })),
    });
  } catch (error) {
    logger.error({ err: error, count: userIds.length }, 'failed to write notifications');
  }
};

const listNotifications = async (userId, { page, limit }) => {
  const [total, unread, data] = await prisma.$transaction([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.findMany({
      where: { userId },
      select: NOTIFICATION_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      unread,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: page * limit < total,
    },
  };
};

const countUnread = (userId) => prisma.notification.count({ where: { userId, readAt: null } });

const markRead = async (userId, id) => {
  const result = await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
};

const markAllRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
};

module.exports = {
  NOTIFICATION_SELECT,
  recipientsWithPermission,
  notify,
  notifyMany,
  listNotifications,
  countUnread,
  markRead,
  markAllRead,
};
