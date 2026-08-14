const prisma = require('../lib/prisma');

const DOCUMENT_SELECT = Object.freeze({
  id: true,
  kind: true,
  slug: true,
  title: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: { select: { id: true, name: true } },
});

const REQUEST_SELECT = Object.freeze({
  id: true,
  subject: true,
  body: true,
  status: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true } },
  resolvedBy: { select: { id: true, name: true } },
});

const INDEX_SLUG = 'index';

const getDocument = (kind) =>
  prisma.document.findUnique({
    relationLoadStrategy: 'join',
    where: { kind_slug: { kind, slug: INDEX_SLUG } },
    select: DOCUMENT_SELECT,
  });

const upsertDocument = async (kind, { title, body }, updatedById, auditEntry) => {
  const writes = [
    prisma.document.upsert({
      relationLoadStrategy: 'join',
      where: { kind_slug: { kind, slug: INDEX_SLUG } },
      update: { title, body, updatedById },
      create: { kind, slug: INDEX_SLUG, title, body, updatedById },
      select: DOCUMENT_SELECT,
    }),
  ];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return results[0];
};

const listRequests = async ({ page, limit, status, userId }) => {
  const where = { ...(status ? { status } : {}), ...(userId ? { userId } : {}) };

  const [total, open, data] = await prisma.$transaction([
    prisma.supportRequest.count({ where }),
    prisma.supportRequest.count({ where: { ...where, status: 'OPEN' } }),
    prisma.supportRequest.findMany({
      relationLoadStrategy: 'join',
      where,
      select: REQUEST_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data,
    meta: { page, limit, total, open, totalPages: Math.ceil(total / limit) || 1 },
  };
};

const getRequest = (id) =>
  prisma.supportRequest.findUnique({
    relationLoadStrategy: 'join',
    where: { id },
    select: REQUEST_SELECT,
  });

const createRequest = async ({ id, userId, subject, body }, auditEntry) => {
  const writes = [
    prisma.supportRequest.create({
      relationLoadStrategy: 'join',
      data: { id, userId, subject, body },
      select: REQUEST_SELECT,
    }),
  ];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return results[0];
};

const setRequestStatus = async (id, status, resolverId, auditEntry) => {
  const closing = status === 'CLOSED';
  const writes = [
    prisma.supportRequest.update({
      relationLoadStrategy: 'join',
      where: { id },
      data: {
        status,
        resolvedById: closing ? resolverId : null,
        resolvedAt: closing ? new Date() : null,
      },
      select: REQUEST_SELECT,
    }),
  ];
  if (auditEntry) writes.push(prisma.auditLog.create({ data: auditEntry, select: { id: true } }));

  const results = await prisma.$transaction(writes);
  return results[0];
};

const updatePreferences = (userId, data) =>
  prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, country: true, timezone: true, timeFormat: true },
  });

module.exports = {
  DOCUMENT_SELECT,
  REQUEST_SELECT,
  INDEX_SLUG,
  getDocument,
  upsertDocument,
  listRequests,
  getRequest,
  createRequest,
  setRequestStatus,
  updatePreferences,
};
