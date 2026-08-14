const { z } = require('zod');

const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

const pageQuerySchema = (defaultLimit, maxLimit) =>
  z.object({
    page: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1, 'page must be 1 or greater').max(1000000).default(1),
    ),
    limit: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number()
        .int()
        .min(1, 'limit must be 1 or greater')
        .default(defaultLimit)
        .transform((value) => Math.min(value, maxLimit)),
    ),
  });

const notificationQuerySchema = pageQuerySchema(10, 50);

const idParamSchema = z.object({ id: z.string().uuid('Invalid id — expected a UUID') });

const documentKindParamSchema = z.object({
  kind: z.enum(['docs', 'support'], {
    errorMap: () => ({ message: 'Kind must be docs or support' }),
  }),
});

const updateDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(160, 'Title must be at most 160 characters'),
    body: z
      .string()
      .trim()
      .min(1, 'Body cannot be empty')
      .max(20000, 'Body must be at most 20000 characters'),
  })
  .strict();

const createSupportRequestSchema = z
  .object({
    subject: z
      .string()
      .trim()
      .min(4, 'Subject must be at least 4 characters')
      .max(160, 'Subject must be at most 160 characters'),
    body: z
      .string()
      .trim()
      .min(10, 'Please describe the problem in at least 10 characters')
      .max(2000, 'Description must be at most 2000 characters'),
  })
  .strict();

const updateSupportRequestSchema = z
  .object({
    status: z.enum(['OPEN', 'CLOSED'], {
      errorMap: () => ({ message: 'Status must be OPEN or CLOSED' }),
    }),
  })
  .strict();

const supportQuerySchema = pageQuerySchema(20, 100).extend({
  status: z.preprocess(emptyToUndefined, z.enum(['OPEN', 'CLOSED']).optional()),
});

const IANA_ZONE = /^[A-Za-z]+(?:[_+-][A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[_+-][A-Za-z0-9]+)*)*$/;

const updatePreferencesSchema = z
  .object({
    country: z
      .string()
      .trim()
      .length(2, 'Country must be a two letter code')
      .regex(/^[A-Za-z]{2}$/, 'Country must be a two letter code')
      .transform((value) => value.toUpperCase())
      .nullable()
      .optional(),
    timezone: z
      .string()
      .trim()
      .max(64, 'Timezone must be at most 64 characters')
      .regex(IANA_ZONE, 'Timezone must be an IANA name such as Asia/Dhaka')
      .refine((value) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Unknown timezone')
      .nullable()
      .optional(),
    timeFormat: z
      .enum(['H12', 'H24'], { errorMap: () => ({ message: 'Time format must be H12 or H24' }) })
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one preference to update',
  });

module.exports = {
  notificationQuerySchema,
  idParamSchema,
  documentKindParamSchema,
  updateDocumentSchema,
  createSupportRequestSchema,
  updateSupportRequestSchema,
  supportQuerySchema,
  updatePreferencesSchema,
};
