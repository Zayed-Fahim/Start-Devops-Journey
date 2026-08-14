const { z } = require('zod');

const emptyToUndefined = (value) => (value === '' || value === null ? undefined : value);

const nameField = z
  .string()
  .trim()
  .min(2, 'Team name must be at least 2 characters')
  .max(64, 'Team name must be at most 64 characters')
  .regex(/^[A-Za-z0-9 _-]+$/, 'Team name may only contain letters, numbers, spaces, _ and -');

const descriptionField = z.string().trim().max(255, 'Description must be at most 255 characters');

const createTeamSchema = z
  .object({
    name: nameField,
    description: descriptionField.optional(),
  })
  .strict();

const updateTeamSchema = z
  .object({
    name: nameField.optional(),
    description: descriptionField.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const teamIdParamSchema = z.object({ id: z.string().uuid('Invalid team id — expected a UUID') });

const memberParamSchema = z.object({
  id: z.string().uuid('Invalid team id — expected a UUID'),
  userId: z.string().uuid('Invalid user id — expected a UUID'),
});

const addMemberSchema = z
  .object({ userId: z.string().uuid('Invalid user id — expected a UUID') })
  .strict();

const setLeadSchema = z
  .object({ userId: z.string().uuid('Invalid user id — expected a UUID').nullable() })
  .strict();

const listMembersQuerySchema = z.object({
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
      .default(50)
      .transform((value) => Math.min(value, 100)),
  ),
});

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  teamIdParamSchema,
  memberParamSchema,
  addMemberSchema,
  setLeadSchema,
  listMembersQuerySchema,
};
