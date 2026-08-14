const { z } = require('zod');

const nameField = z
  .string()
  .trim()
  .min(2, 'Role name must be at least 2 characters')
  .max(64, 'Role name must be at most 64 characters')
  .regex(/^[A-Za-z0-9 _-]+$/, 'Role name may only contain letters, numbers, spaces, _ and -');

const permissionsField = z
  .array(z.string().trim().min(1).max(64))
  .max(64, 'Too many permissions')
  .transform((keys) => [...new Set(keys)]);

const createRoleSchema = z
  .object({
    name: nameField,
    description: z.string().trim().max(255).optional(),
    permissions: permissionsField.default([]),
  })
  .strict();

const updateRoleSchema = z
  .object({
    name: nameField.optional(),
    description: z.string().trim().max(255).optional(),
    permissions: permissionsField.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const roleIdParamSchema = z.object({ id: z.string().uuid('Invalid role id') });

module.exports = { createRoleSchema, updateRoleSchema, roleIdParamSchema };
