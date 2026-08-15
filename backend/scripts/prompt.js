const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

const AFFIRMATIVE = new Set(['y', 'yes']);

const confirm = async (question) => {
  if (!stdin.isTTY) {
    throw new Error(
      'This script needs an interactive terminal to take consent. Re-run it directly, not through a pipe.',
    );
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return AFFIRMATIVE.has(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
};

module.exports = { confirm };
