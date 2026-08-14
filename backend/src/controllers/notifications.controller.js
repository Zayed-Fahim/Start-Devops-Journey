const notifications = require('../services/notifications.service');
const { parseOrThrow } = require('../validation/users.validation');
const { notificationQuerySchema, idParamSchema } = require('../validation/content.validation');

const listNotifications = async (req, res) => {
  const query = parseOrThrow(notificationQuerySchema, req.query, 'Invalid query parameters');
  res.status(200).json(await notifications.listNotifications(req.user.id, query));
};

const unreadCount = async (req, res) => {
  res.status(200).json({ unread: await notifications.countUnread(req.user.id) });
};

const markRead = async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params, 'Invalid notification id');
  const changed = await notifications.markRead(req.user.id, id);
  if (changed === 0) {
    const unread = await notifications.countUnread(req.user.id);
    res.status(200).json({ changed: 0, unread });
    return;
  }
  res.status(200).json({ changed, unread: await notifications.countUnread(req.user.id) });
};

const markAllRead = async (req, res) => {
  const changed = await notifications.markAllRead(req.user.id);
  res.status(200).json({ changed, unread: 0 });
};

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
