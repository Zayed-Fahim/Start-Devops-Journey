const { z } = require('zod');

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
  .refine((value) => /[a-z]/.test(value), {
    message: 'Password must contain a lowercase letter',
  })
  .refine((value) => /[A-Z]/.test(value), {
    message: 'Password must contain an uppercase letter',
  })
  .refine((value) => /[0-9]/.test(value), {
    message: 'Password must contain a number',
  });

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(120, 'Name must be at most 120 characters'),
    email: emailField,
    password: passwordField,
  })
  .strict();

const loginSchema = z
  .object({
    email: emailField,
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

module.exports = { registerSchema, loginSchema };
