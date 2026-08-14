const path = require("node:path");
const { z } = require("zod");

// Load a local .env file for HOST development (running `yarn dev` directly).
// Inside Docker this is a no-op that finds nothing, because Compose already
// injected the variables via env_file. Either way dotenv NEVER overwrites a
// variable that is already set, so the container's real environment always
// wins over a stale file on disk.
const envFile = process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
require("dotenv").config({ path: path.resolve(__dirname, "../..", envFile) });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Read from the environment, never hardcoded. The container and the host
  // port mapping have to agree, and that agreement belongs in configuration.
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (postgresql://user:pass@host:5432/db)"),

  // Comma-separated so you can allow more than one origin without a code
  // change (e.g. a preview deployment alongside localhost).
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),

  // Cost factor. Each +1 DOUBLES the time to hash. 10 is ~50-100ms, which is
  // slow enough to make offline brute force expensive and fast enough that a
  // login endpoint stays usable. Configurable so tests can drop it to 4.
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
});

const parsed = envSchema.safeParse(process.env);

// Fail at BOOT, loudly, rather than at the first request that happens to need
// the missing value. A container that refuses to start is a visible problem;
// a container that starts and 500s on one endpoint is a silent one.
if (!parsed.success) {
  console.error("✖ Invalid environment configuration:\n");
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  console.error("\nSee backend/.env.example for the full list.\n");
  process.exit(1);
}

const env = parsed.data;

env.corsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = env;
