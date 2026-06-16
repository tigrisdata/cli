/**
 * Agent skill installation for `tigris project setup`.
 *
 * Fetches the skills repo tarball and installs the Tigris storage skills into
 * the project at .agents/skills, with per-skill symlinks from .claude/skills so
 * Claude Code (and other skill-aware agents) pick them up. We intentionally do
 * NOT install the Claude Code plugin from here: that mutates global config and
 * can't take effect inside the same Claude session that launched setup.
 *
 * Everything here is best-effort: failures are reported but never abort the
 * surrounding project setup.
 */

import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { run } from './exec.js';

const SKILLS_TARBALL_URL =
  'https://codeload.github.com/tigrisdata/skills/tar.gz/refs/heads/main';
// Top-level directory inside the tarball (GitHub names it <repo>-<ref>).
const SKILLS_TARBALL_ROOT = 'skills-main';

/**
 * Tigris storage-relevant skills to install. Generic skills in the repo
 * (conventional-commits, go-table-driven-tests, language SDKs, …) are skipped.
 */
export const STORAGE_SKILLS = [
  'file-storage',
  'tigris-agent-kit',
  'tigris-backup-export',
  'tigris-bucket-management',
  'tigris-egress-optimizer',
  'tigris-image-optimization',
  'tigris-lifecycle-management',
  'tigris-object-operations',
];

export type AgentSetupResult = {
  mode: 'skills';
  installed: string[];
  error?: string;
};

/** lstat the path, returning null if it doesn't exist. */
async function lstatOrNull(path: string) {
  try {
    return await lstat(path);
  } catch {
    return null;
  }
}

/**
 * Copy the allowlisted storage skills from an extracted skills directory into
 * the project's .agents/skills, then create per-skill symlinks under
 * .claude/skills (.claude/skills/<name> -> ../../.agents/skills/<name>).
 *
 * Returns the names of the skills that were installed. An existing real (non-
 * symlink) entry in .claude/skills is left untouched rather than clobbered.
 */
export async function installSkillsFromDir(
  sourceSkillsDir: string,
  projectDir: string
): Promise<string[]> {
  const agentsSkillsDir = join(projectDir, '.agents', 'skills');
  const claudeSkillsDir = join(projectDir, '.claude', 'skills');
  await mkdir(agentsSkillsDir, { recursive: true });
  await mkdir(claudeSkillsDir, { recursive: true });

  const installed: string[] = [];

  for (const name of STORAGE_SKILLS) {
    const src = join(sourceSkillsDir, name);
    const srcStat = await lstatOrNull(src);
    if (!srcStat?.isDirectory()) continue;

    // Refresh the canonical copy under .agents/skills.
    const dest = join(agentsSkillsDir, name);
    await rm(dest, { recursive: true, force: true });
    await cp(src, dest, { recursive: true });
    installed.push(name);

    // Link it into .claude/skills with a relative target.
    const link = join(claudeSkillsDir, name);
    const existing = await lstatOrNull(link);
    if (existing?.isSymbolicLink()) {
      await rm(link);
    } else if (existing) {
      // A real directory/file lives here — don't clobber it.
      continue;
    }
    await symlink(relative(claudeSkillsDir, dest), link);
  }

  return installed;
}

/**
 * Download and extract the skills tarball, then install storage skills into the
 * project. Uses the system `tar` to unpack.
 */
async function installSkillsFromTarball(projectDir: string): Promise<string[]> {
  const tmp = await mkdtemp(join(tmpdir(), 'tigris-skills-'));
  try {
    const res = await fetch(SKILLS_TARBALL_URL);
    if (!res.ok) {
      throw new Error(`Failed to download skills tarball (HTTP ${res.status})`);
    }
    const tarPath = join(tmp, 'skills.tar.gz');
    await writeFile(tarPath, Buffer.from(await res.arrayBuffer()));
    await run('tar', ['-xzf', tarPath, '-C', tmp]);

    const sourceSkillsDir = join(tmp, SKILLS_TARBALL_ROOT, 'skills');
    if (!(await lstatOrNull(sourceSkillsDir))) {
      throw new Error('Unexpected skills tarball layout');
    }
    return await installSkillsFromDir(sourceSkillsDir, projectDir);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

/**
 * Install Tigris skills for the project. Best-effort: any failure is captured
 * in the returned result rather than thrown.
 */
export async function setupAgentResources(
  projectDir: string,
  options: { quiet?: boolean } = {}
): Promise<AgentSetupResult> {
  void options; // reserved for future flags; no per-mode behavior today
  try {
    const installed = await installSkillsFromTarball(projectDir);
    return { mode: 'skills', installed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { mode: 'skills', installed: [], error: message };
  }
}
