const crypto = require('crypto');
const content = require('../services/content.service');
const notifications = require('../services/notifications.service');
const audit = require('../services/audit.service');
const { notFound, forbidden } = require('../lib/httpError');
const { parseOrThrow } = require('../validation/users.validation');
const {
  documentKindParamSchema,
  updateDocumentSchema,
  createSupportRequestSchema,
  updateSupportRequestSchema,
  supportQuerySchema,
  idParamSchema,
  updatePreferencesSchema,
} = require('../validation/content.validation');

const requestContext = (req) => ({
  userAgent: req.get('user-agent') ?? undefined,
  ip: req.ip ?? undefined,
});

const KINDS = { docs: 'DOCS', support: 'SUPPORT' };
const EDIT_PERMISSION = { DOCS: 'docs.manage', SUPPORT: 'support.manage' };

const getDocument = async (req, res) => {
  const { kind } = parseOrThrow(documentKindParamSchema, req.params, 'Invalid document kind');
  const document = await content.getDocument(KINDS[kind]);
  if (!document) throw notFound(`No ${kind} page has been written yet`);

  const granted = req.permissions ?? [];
  res.status(200).json({ ...document, canEdit: granted.includes(EDIT_PERMISSION[KINDS[kind]]) });
};

const updateDocument = async (req, res) => {
  const { kind } = parseOrThrow(documentKindParamSchema, req.params, 'Invalid document kind');
  const data = parseOrThrow(updateDocumentSchema, req.body, 'Invalid request body');
  const documentKind = KINDS[kind];

  const granted = req.permissions ?? [];
  if (!granted.includes(EDIT_PERMISSION[documentKind])) {
    throw forbidden('You do not have permission to edit this page', [
      { field: 'permission', message: EDIT_PERMISSION[documentKind] },
    ]);
  }

  const document = await content.upsertDocument(
    documentKind,
    data,
    req.user.id,
    audit.buildEntry({
      actor: req.user,
      action: audit.AUDIT_ACTIONS.DOCUMENT_UPDATED,
      category: 'UPDATE',
      summary: `updated the ${kind} page`,
      target: { type: 'document', id: documentKind, label: data.title },
      context: requestContext(req),
    }),
  );

  res.status(200).json({ ...document, canEdit: true });
};

const listRequests = async (req, res) => {
  const query = parseOrThrow(supportQuerySchema, req.query, 'Invalid query parameters');
  const granted = req.permissions ?? [];
  const manages = granted.includes('support.manage');

  const result = await content.listRequests({
    ...query,
    userId: manages ? undefined : req.user.id,
  });

  res.status(200).json({ ...result, meta: { ...result.meta, manages } });
};

const createRequest = async (req, res) => {
  const data = parseOrThrow(createSupportRequestSchema, req.body, 'Invalid request body');
  const id = crypto.randomUUID();

  const request = await content.createRequest(
    { ...data, id, userId: req.user.id },
    audit.buildEntry({
      actor: req.user,
      action: audit.AUDIT_ACTIONS.SUPPORT_REQUESTED,
      category: 'CREATE',
      summary: `raised a support request: ${data.subject}`,
      target: { type: 'support', id, label: data.subject },
      context: requestContext(req),
    }),
  );

  const recipients = await notifications.recipientsWithPermission('support.manage', {
    exclude: req.user.id,
  });
  await notifications.notifyMany(recipients, {
    title: 'New support request',
    body: `${req.user.name ?? 'Someone'}: ${data.subject}`,
    href: '/support',
    category: 'CREATE',
  });

  res.status(201).json(request);
};

const updateRequest = async (req, res) => {
  const { id } = parseOrThrow(idParamSchema, req.params, 'Invalid request id');
  const { status } = parseOrThrow(updateSupportRequestSchema, req.body, 'Invalid request body');

  const existing = await content.getRequest(id);
  if (!existing) throw notFound(`No support request found with id ${id}`);

  const request = await content.setRequestStatus(
    id,
    status,
    req.user.id,
    audit.buildEntry({
      actor: req.user,
      action: audit.AUDIT_ACTIONS.SUPPORT_UPDATED,
      category: 'UPDATE',
      summary: `marked support request ${existing.subject} as ${status.toLowerCase()}`,
      target: { type: 'support', id, label: existing.subject },
      context: requestContext(req),
    }),
  );

  if (existing.user.id !== req.user.id) {
    await notifications.notify({
      userId: existing.user.id,
      title:
        status === 'CLOSED' ? 'Your support request was closed' : 'Your support request reopened',
      body: existing.subject,
      href: '/support',
      category: 'UPDATE',
    });
  }

  res.status(200).json(request);
};

const updatePreferences = async (req, res) => {
  const data = parseOrThrow(updatePreferencesSchema, req.body, 'Invalid request body');
  res.status(200).json(await content.updatePreferences(req.user.id, data));
};

module.exports = {
  getDocument,
  updateDocument,
  listRequests,
  createRequest,
  updateRequest,
  updatePreferences,
};
