const { z } = require('zod');

const CATEGORIES = ['CREATE', 'UPDATE', 'DELETE', 'SECURITY'];

const RANGE_DAYS = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };

const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

const listAuditLogsQuerySchema = z
  .object({
    page: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(1, 'page must be 1 or greater').max(1_000_000).default(1),
    ),
    limit: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number()
        .int()
        .min(1, 'limit must be 1 or greater')
        .default(20)
        .transform((value) => Math.min(value, 100)),
    ),
    search: z.preprocess(emptyToUndefined, z.string().trim().max(255).optional()),
    category: z.preprocess(emptyToUndefined, z.enum(CATEGORIES).optional()),
    action: z.preprocess(emptyToUndefined, z.string().trim().max(64).optional()),
    range: z.preprocess(emptyToUndefined, z.enum(Object.keys(RANGE_DAYS)).default('30d')),
  })
  .transform((query) => {
    const days = RANGE_DAYS[query.range];
    return {
      ...query,
      from: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      to: undefined,
    };
  });

module.exports = { CATEGORIES, RANGE_DAYS, listAuditLogsQuerySchema };
