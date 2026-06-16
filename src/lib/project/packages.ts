/**
 * NPM package installation for `tigris project setup`.
 *
 * Installs the runtime packages a freshly set-up Tigris project needs:
 * `@tigrisdata/storage` (the storage SDK the generated .env targets) and
 * `@tigrisdata/agent-kit`. Best-effort: a missing `npm`, no package.json, or a
 * failed install is reported but never aborts the surrounding project setup.
 */

import { run } from './exec.js';

/** Packages installed into the project by default. */
export const PROJECT_PACKAGES = [
  '@tigrisdata/storage',
  '@tigrisdata/agent-kit',
];

export type PackageInstallResult = {
  installed: string[];
  error?: string;
};

/**
 * Run `npm install <packages>` in the project directory. Any failure is
 * captured in the returned result rather than thrown.
 */
export async function installProjectPackages(
  projectDir: string,
  options: { quiet?: boolean } = {}
): Promise<PackageInstallResult> {
  try {
    await run('npm', ['install', ...PROJECT_PACKAGES], {
      cwd: projectDir,
      stdio: options.quiet ? 'ignore' : 'inherit',
    });
    return { installed: [...PROJECT_PACKAGES] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { installed: [], error: message };
  }
}
