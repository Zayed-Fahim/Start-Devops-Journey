const { z } = require("zod");
const { badRequest } = require("../lib/httpError");

const ROLES = ["ADMIN", "DEVELOPER", "USER"];
const STATUSES = ["ACTIVE", "INACTIVE"];

// ALLOWLIST. `sortBy` is interpolated into an ORDER BY, so it can never be
// raw client input -- that is how you get SQL injection through a sort
// parameter. Prisma parameterises values but NOT column identifiers, so the
// guarantee has to come from here.
// Exactly the five columns DESIGN.md §7 documents — no more. `updatedAt` was
// briefly in here; it is a column the contract does not offer, and an
// allowlist that quietly grows past its spec is how the spec stops being true.
const SORTABLE_FIELDS = ["name", "email", "role", "status", "createdAt"];

// A query string carries no concept of "absent": `?role=` arrives as an empty
// string, not undefined. The dashboard sends exactly that when you clear a
// filter, so without this an empty dropdown would 400 instead of meaning
// "no filter".
const emptyToUndefined = (value) =>
  value === "" || value === null ? undefined : value;

const nameField = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Name must be at most 120 characters");

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address")
  .max(255, "Email must be at most 255 characters");

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  // bcrypt silently TRUNCATES at 72 bytes. Without this check a 100-character
  // password and its first 72 bytes are the same password, which is a
  // security surprise nobody wants to discover later. Bytes, not characters:
  // one emoji is four bytes.
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
    message: "Password must be at most 72 bytes",
  });

// Shared field definitions WITHOUT defaults. Defaults belong to create only:
// if `role` defaulted to USER here, a PATCH that omitted `role` would silently
// demote an admin on every edit.
const userFields = {
  name: nameField,
  email: emailField,
  password: passwordField,
  role: z.enum(ROLES, { errorMap: () => ({ message: `Role must be one of: ${ROLES.join(", ")}` }) }),
  status: z.enum(STATUSES, { errorMap: () => ({ message: `Status must be one of: ${STATUSES.join(", ")}` }) }),
};

// .strict() rejects unknown keys instead of ignoring them. A typo like
// "roles" or "Status" becomes a clear 400 rather than a create that silently
// does not do what the caller asked. It also blocks mass-assignment: a client
// cannot smuggle `id` or `createdAt` into the payload.
const createUserSchema = z
  .object({
    ...userFields,
    role: userFields.role.default("USER"),
    status: userFields.status.default("ACTIVE"),
  })
  .strict();

const updateUserSchema = z
  .object(userFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

const listUsersQuerySchema = z.object({
  page: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(1, "page must be 1 or greater")
      // The upper bound is not paranoia. `skip` is computed as
      // (page - 1) * limit and handed to Postgres as a BIGINT. With no ceiling,
      // ?page=1e18 overflows a 64-bit signed integer, Prisma throws an error
      // the error middleware cannot classify, and a client-supplied query
      // parameter produces a 500 — on an endpoint whose contract says it can
      // only answer 200 or 400. Bound the input and it is a clean 400.
      .max(1_000_000, "page is out of range")
      .default(1)
  ),
  // Capped, not rejected: a client asking for 1,000,000 rows gets 100 rather
  // than a 400. The cap protects the server from an unbounded query regardless
  // of what the client believes it wants.
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(1, "limit must be 1 or greater")
      .default(10)
      .transform((value) => Math.min(value, 100))
  ),
  search: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(255).optional()
  ),
  role: z.preprocess(emptyToUndefined, z.enum(ROLES).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(STATUSES).optional()),
  sortBy: z.preprocess(
    emptyToUndefined,
    z.enum(SORTABLE_FIELDS).default("createdAt")
  ),
  order: z.preprocess(
    emptyToUndefined,
    z.enum(["asc", "desc"]).default("desc")
  ),
});

const userIdParamSchema = z.object({
  // Validating the shape here means a malformed id returns 400 ("that is not
  // an id") instead of Postgres raising a type error that surfaces as a 500.
  id: z.string().uuid("Invalid user id — expected a UUID"),
});

/** Turn a ZodError into the flat [{ field, message }] the API contract promises. */
const formatIssues = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join(".") || "(body)",
    message: issue.message,
  }));

/** Parse or throw a 400 carrying every field error at once. */
const parseOrThrow = (schema, data, message) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Every failing field is reported in one response, so the form can show
    // all its errors at once instead of the user fixing them one reload at a
    // time.
    throw badRequest(message, formatIssues(result.error));
  }
  return result.data;
};

module.exports = {
  ROLES,
  STATUSES,
  SORTABLE_FIELDS,
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
  formatIssues,
  parseOrThrow,
};
