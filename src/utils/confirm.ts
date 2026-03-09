/**
 * Shared confirmation prompt with --yes and non-TTY support.
 */

import * as readline from 'readline';

/**
 * Ask the user to confirm a destructive action.
 *
 * Auto-confirms (returns true) when:
 *   - options.yes is true (--yes flag)
 *   - stdin is not a TTY (piped/non-interactive)
 */
export async function confirm(
  message: string,
  options?: { yes?: boolean }
): Promise<boolean> {
  if (options?.yes || !process.stdin.isTTY) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}
