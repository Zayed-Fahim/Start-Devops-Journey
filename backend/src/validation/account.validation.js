const { z } = require('zod');

const newPasswordField = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(32, 'Password must be at most 32 characters')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password must be at most 72 bytes',
  })
  .refine((value) => /[a-z]/.test(value), {
    message: 'Password must contain a lowercase letter',
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: 'Password must contain an uppercase letter',
  })
  .refine((value) => /[0-9]/.test(value), {
    message: 'Password must contain a number',
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: newPasswordField,
  })
  .strict()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword'],
  });

const sessionIdParamSchema = z.object({
  id: z.string().uuid('Invalid session id'),
});

module.exports = { changePasswordSchema, sessionIdParamSchema };
