/**
 * Small async process runner shared by the `tigris project setup` helpers.
 */

import { spawn } from 'node:child_process';

export const COMMAND_TIMEOUT_MS = 120_000;

/**
 * Run a command to completion without blocking the event loop. Rejects on a
 * non-zero exit, spawn error (e.g. command not found), or timeout.
 */
export function run(
  command: string,
  args: string[],
  options: { stdio?: 'inherit' | 'ignore'; cwd?: string } = {}
): Promise<void> {
  const { stdio = 'ignore', cwd } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio, cwd });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${command} timed out`));
    }, COMMAND_TIMEOUT_MS);
    child.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}
