import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  installSkillsFromDir,
  STORAGE_SKILLS,
} from '../../../src/lib/project/agent-setup.js';

describe('installSkillsFromDir', () => {
  let dir: string;
  let sourceSkillsDir: string;
  let projectDir: string;

  function makeSkill(name: string) {
    const skillDir = join(sourceSkillsDir, name);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), `# ${name}\n`);
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tigris-agent-setup-'));
    sourceSkillsDir = join(dir, 'src-skills');
    projectDir = join(dir, 'project');
    mkdirSync(sourceSkillsDir, { recursive: true });
    mkdirSync(projectDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('copies allowlisted skills into .agents/skills and symlinks .claude/skills', async () => {
    makeSkill('tigris-bucket-management');
    makeSkill('tigris-object-operations');

    const installed = await installSkillsFromDir(sourceSkillsDir, projectDir);

    expect(installed.sort()).toEqual([
      'tigris-bucket-management',
      'tigris-object-operations',
    ]);

    // Canonical copy exists with content.
    const agentSkill = join(
      projectDir,
      '.agents',
      'skills',
      'tigris-bucket-management',
      'SKILL.md'
    );
    expect(lstatSync(agentSkill).isFile()).toBe(true);

    // .claude/skills entry is a symlink with a relative target.
    const link = join(
      projectDir,
      '.claude',
      'skills',
      'tigris-bucket-management'
    );
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    const target = readlinkSync(link);
    expect(target).toBe(
      join('..', '..', '.agents', 'skills', 'tigris-bucket-management')
    );
    // …and it resolves back to the canonical copy.
    expect(resolve(join(projectDir, '.claude', 'skills'), target)).toBe(
      join(projectDir, '.agents', 'skills', 'tigris-bucket-management')
    );
  });

  it('ignores generic skills not on the storage allowlist', async () => {
    makeSkill('conventional-commits');
    makeSkill('go-table-driven-tests');
    makeSkill('tigris-object-operations');

    const installed = await installSkillsFromDir(sourceSkillsDir, projectDir);

    expect(installed).toEqual(['tigris-object-operations']);
  });

  it('does not clobber an existing real directory in .claude/skills', async () => {
    makeSkill('tigris-object-operations');
    const claudeSkill = join(
      projectDir,
      '.claude',
      'skills',
      'tigris-object-operations'
    );
    mkdirSync(claudeSkill, { recursive: true });
    writeFileSync(join(claudeSkill, 'mine.md'), 'keep me\n');

    await installSkillsFromDir(sourceSkillsDir, projectDir);

    // Still a real directory, not a symlink, and our file survives.
    expect(lstatSync(claudeSkill).isSymbolicLink()).toBe(false);
    expect(lstatSync(join(claudeSkill, 'mine.md')).isFile()).toBe(true);
    // But the canonical copy was still installed under .agents/skills.
    expect(
      lstatSync(
        join(projectDir, '.agents', 'skills', 'tigris-object-operations')
      ).isDirectory()
    ).toBe(true);
  });

  it('replaces a stale symlink on reinstall', async () => {
    makeSkill('tigris-object-operations');
    await installSkillsFromDir(sourceSkillsDir, projectDir);
    // Re-running is idempotent and keeps a valid symlink.
    const installed = await installSkillsFromDir(sourceSkillsDir, projectDir);
    expect(installed).toEqual(['tigris-object-operations']);
    const link = join(
      projectDir,
      '.claude',
      'skills',
      'tigris-object-operations'
    );
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
  });

  it('exposes only Tigris storage skills in the allowlist', () => {
    expect(STORAGE_SKILLS).toContain('file-storage');
    expect(STORAGE_SKILLS).toContain('tigris-bucket-management');
    expect(STORAGE_SKILLS).not.toContain('conventional-commits');
    expect(STORAGE_SKILLS).not.toContain('go-table-driven-tests');
  });
});
