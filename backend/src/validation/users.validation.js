const { z } = require('zod');
const { badRequest } = require('../lib/httpError');

const STATUSES = ['ACTIVE', 'INACTIVE'];
const SORTABLE_FIELDS = ['name', 'email', 'role', 'status', 'createdAt'];
const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);
const nameField = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(120, 'Name must be at most 120 characters');
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email address')
  .max(255, 'Email must be at most 255 characters');
const passwordField = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(32, 'Password must be at most 32 characters')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password must be at most 72 bytes',
  });
const userFields = {
  name: nameField,
  email: emailField,
  password: passwordField,
  role: z.string().trim().min(1, 'Role is required').max(64),
  status: z.enum(STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${STATUSES.join(', ')}` }),
  }),
};
const createUserSchema = z
  .object({
    ...userFields,
    role: userFields.role.default('USER'),
    status: userFields.status.default('ACTIVE'),
  })
  .strict();
const updateUserSchema = z
  .object(userFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });
const listUsersQuerySchema = z.object({
  page: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(1, 'page must be 1 or greater')
      .max(1000000, 'page is out of range')
      .default(1),
  ),
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(1, 'limit must be 1 or greater')
      .default(10)
      .transform((value) => Math.min(value, 100)),
  ),
  search: z.preprocess(emptyToUndefined, z.string().trim().max(255).optional()),
  role: z.preprocess(emptyToUndefined, z.string().trim().max(64).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(STATUSES).optional()),
  sortBy: z.preprocess(emptyToUndefined, z.enum(SORTABLE_FIELDS).default('createdAt')),
  order: z.preprocess(emptyToUndefined, z.enum(['asc', 'desc']).default('desc')),
});
const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user id — expected a UUID'),
});
const formatIssues = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || '(body)',
    message: issue.message,
  }));
const parseOrThrow = (schema, data, message) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(message, formatIssues(result.error));
  }
  return result.data;
};
module.exports = {
  STATUSES,
  SORTABLE_FIELDS,
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
  formatIssues,
  parseOrThrow,
};
