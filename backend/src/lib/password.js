const argon2 = require('argon2');
const bcrypt = require('bcryptjs');
const env = require('./env');

/**
 * Argon2id, with the parameters OWASP recommends as a floor: 19 MiB of memory,
 * two passes, one lane. Memory is the point — bcrypt is cheap to parallelise on
 * a GPU because it needs almost none, while argon2id forces an attacker to buy
 * RAM per guess.
 */
const ARGON2_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: env.ARGON2_MEMORY_COST,
  timeCost: env.ARGON2_TIME_COST,
  parallelism: env.ARGON2_PARALLELISM,
});

/**
 * Rows written before the argon2 migration still hold `$2a$`/`$2b$`/`$2y$`
 * bcrypt digests. Rejecting them would lock out every existing account, so they
 * are still verified — once, on the next successful sign-in, after which the
 * caller rehashes with argon2 and the old digest is gone.
 *
 * bcryptjs exists in package.json for this path and nothing else. When
 * `SELECT count(*) FROM users WHERE password LIKE '$2%'` reaches zero, delete
 * this function, its import, and the dependency.
 */
const isLegacyHash = (hash) => typeof hash === 'string' && /^\$2[aby]?\$/.test(hash);

const hashPassword = (plain) => argon2.hash(plain, ARGON2_OPTIONS);

/**
 * Returns { matches, needsRehash }. `needsRehash` is true for a correct password
 * whose stored digest is either bcrypt or argon2 at weaker parameters than the
 * ones currently configured, so raising ARGON2_* in .env migrates accounts as
 * they sign in rather than requiring a reset.
 */
const verifyPassword = async (hash, plain) => {
  if (isLegacyHash(hash)) {
    const matches = await bcrypt.compare(plain, hash);
    return { matches, needsRehash: matches };
  }

  try {
    const matches = await argon2.verify(hash, plain);
    return { matches, needsRehash: matches && argon2.needsRehash(hash, ARGON2_OPTIONS) };
  } catch {
    // A malformed or truncated digest is a failed login, not a 500.
    return { matches: false, needsRehash: false };
  }
};

/**
 * Login compares against this when the email does not exist, so the response
 * time does not reveal which addresses are registered. It must be a real argon2
 * hash built with the configured parameters — a cheaper stand-in would make
 * "no such user" measurably faster than "wrong password".
 *
 * Built once, lazily, because argon2 has no synchronous hash and paying ~45ms
 * at require() time would slow every process start including the CLI scripts.
 */
let dummyHashPromise = null;
const dummyHash = () => {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword('unused-placeholder-for-timing-equalisation');
  }
  return dummyHashPromise;
};

const equaliseTiming = async (plain) => {
  await verifyPassword(await dummyHash(), plain);
};

module.exports = { hashPassword, verifyPassword, equaliseTiming, isLegacyHash };
