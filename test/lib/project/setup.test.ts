import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks (hoisted) --------------------------------------------------------

vi.mock('../../../src/auth/provider.js', () => ({
  getStorageConfig: vi.fn(async () => ({})),
  getTigrisConfig: vi.fn(() => ({ endpoint: 'https://t3.storage.dev' })),
  resolveAuthMethod: vi.fn(async () => ({ type: 'oauth' })),
}));

vi.mock('../../../src/auth/iam.js', () => ({
  getIAMConfig: vi.fn(async () => ({})),
}));

vi.mock('@tigrisdata/storage', () => ({
  createBucket: vi.fn(async () => ({ error: null })),
  removeBucket: vi.fn(async () => ({ error: null })),
}));

vi.mock('@tigrisdata/iam', () => ({
  createAccessKey: vi.fn(async () => ({
    data: { id: 'tid_test', secret: 'tsec_test', name: 'test-key' },
    error: null,
  })),
  assignBucketRoles: vi.fn(async () => ({ error: null })),
}));

vi.mock('../../../src/lib/login/oauth.js', () => ({
  oauth: vi.fn(async () => {}),
}));

vi.mock('../../../src/lib/project/agent-setup.js', () => ({
  setupAgentResources: vi.fn(async () => ({ mode: 'skills', installed: [] })),
}));

vi.mock('../../../src/lib/project/packages.js', () => ({
  installProjectPackages: vi.fn(async () => ({
    installed: ['@tigrisdata/storage', '@tigrisdata/agent-kit'],
  })),
}));

vi.mock('../../../src/utils/exit.js', () => ({
  failWithError: vi.fn((_ctx: unknown, msg: unknown) => {
    throw new Error(typeof msg === 'string' ? msg : String(msg));
  }),
  printNextActions: vi.fn(),
}));

vi.mock('../../../src/utils/messages.js', () => ({
  msg: vi.fn(() => ({ command: 'project', operation: 'setup' })),
  printStart: vi.fn(),
  printSuccess: vi.fn(),
}));

import { assignBucketRoles, createAccessKey } from '@tigrisdata/iam';
import { createBucket, removeBucket } from '@tigrisdata/storage';

import { resolveAuthMethod } from '../../../src/auth/provider.js';
import { oauth } from '../../../src/lib/login/oauth.js';
import { setupAgentResources } from '../../../src/lib/project/agent-setup.js';
import { installProjectPackages } from '../../../src/lib/project/packages.js';
import setup from '../../../src/lib/project/setup.js';

// --- Helpers ----------------------------------------------------------------

let dir: string;
const envPath = () => join(dir, '.env');

beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply default resolved values cleared by clearAllMocks.
  vi.mocked(resolveAuthMethod).mockResolvedValue({ type: 'oauth' } as never);
  vi.mocked(createBucket).mockResolvedValue({ error: null } as never);
  vi.mocked(removeBucket).mockResolvedValue({ error: null } as never);
  vi.mocked(createAccessKey).mockResolvedValue({
    data: { id: 'tid_test', secret: 'tsec_test', name: 'test-key' },
    error: null,
  } as never);
  vi.mocked(assignBucketRoles).mockResolvedValue({ error: null } as never);
  dir = mkdtempSync(join(tmpdir(), 'tigris-project-setup-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// --- Tests ------------------------------------------------------------------

describe('project setup', () => {
  it('creates a bucket, an Editor access key, and writes the .env', async () => {
    await setup({ 'env-file': envPath() });

    expect(createBucket).toHaveBeenCalledTimes(1);
    const [bucketName, bucketOpts] = vi.mocked(createBucket).mock.calls[0];
    expect(typeof bucketName).toBe('string');
    expect(bucketName.length).toBeGreaterThan(0);
    expect((bucketOpts as { access: string }).access).toBe('private');

    expect(createAccessKey).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createAccessKey).mock.calls[0][0]).toBe(
      `${bucketName}-key`
    );

    expect(assignBucketRoles).toHaveBeenCalledTimes(1);
    const [keyId, assignments] = vi.mocked(assignBucketRoles).mock.calls[0];
    expect(keyId).toBe('tid_test');
    expect(assignments).toEqual([{ bucket: bucketName, role: 'Editor' }]);

    const contents = readFileSync(envPath(), 'utf-8');
    expect(contents).toContain('TIGRIS_STORAGE_ACCESS_KEY_ID=tid_test');
    expect(contents).toContain('TIGRIS_STORAGE_SECRET_ACCESS_KEY=tsec_test');
    expect(contents).toContain(
      'TIGRIS_STORAGE_ENDPOINT=https://t3.storage.dev'
    );
    expect(contents).toContain(`TIGRIS_STORAGE_BUCKET=${bucketName}`);
  });

  it('uses the provided bucket name when --bucket is given', async () => {
    await setup({ 'env-file': envPath(), bucket: 'my-app' });

    expect(vi.mocked(createBucket).mock.calls[0][0]).toBe('my-app');
    expect(readFileSync(envPath(), 'utf-8')).toContain(
      'TIGRIS_STORAGE_BUCKET=my-app'
    );
  });

  it('aborts when a .env already exists and --force is not set', async () => {
    writeFileSync(envPath(), 'EXISTING=1\n');

    await expect(setup({ 'env-file': envPath() })).rejects.toThrow(
      /already exists/
    );

    expect(createBucket).not.toHaveBeenCalled();
    // Existing file is untouched.
    expect(readFileSync(envPath(), 'utf-8')).toBe('EXISTING=1\n');
  });

  it('overwrites an existing .env when --force is set', async () => {
    writeFileSync(envPath(), 'EXISTING=1\n');

    await setup({ 'env-file': envPath(), force: true });

    expect(createBucket).toHaveBeenCalledTimes(1);
    const contents = readFileSync(envPath(), 'utf-8');
    expect(contents).not.toContain('EXISTING=1');
    expect(contents).toContain('TIGRIS_STORAGE_ACCESS_KEY_ID=tid_test');
  });

  it('triggers OAuth login when not authenticated', async () => {
    vi.mocked(resolveAuthMethod).mockResolvedValue({ type: 'none' } as never);

    await setup({ 'env-file': envPath() });

    expect(oauth).toHaveBeenCalledTimes(1);
    expect(createBucket).toHaveBeenCalledTimes(1);
  });

  it('does not trigger OAuth when already authenticated', async () => {
    await setup({ 'env-file': envPath() });
    expect(oauth).not.toHaveBeenCalled();
  });

  it('installs agent resources by default', async () => {
    await setup({ 'env-file': envPath() });
    expect(setupAgentResources).toHaveBeenCalledTimes(1);
  });

  it('installs the project npm packages by default', async () => {
    await setup({ 'env-file': envPath() });
    expect(installProjectPackages).toHaveBeenCalledTimes(1);
  });

  it('skips package install when --skip-install is given', async () => {
    await setup({ 'env-file': envPath(), 'skip-install': true });
    expect(installProjectPackages).not.toHaveBeenCalled();
    // The rest of setup still completes.
    expect(readFileSync(envPath(), 'utf-8')).toContain(
      'TIGRIS_STORAGE_ACCESS_KEY_ID=tid_test'
    );
  });

  it('skips agent setup when --skip-agent-setup is given', async () => {
    await setup({ 'env-file': envPath(), 'skip-agent-setup': true });
    expect(setupAgentResources).not.toHaveBeenCalled();
    // The rest of setup still completes.
    expect(readFileSync(envPath(), 'utf-8')).toContain(
      'TIGRIS_STORAGE_ACCESS_KEY_ID=tid_test'
    );
  });

  it('rolls back the bucket and does not write .env if access-key creation fails', async () => {
    vi.mocked(createAccessKey).mockResolvedValue({
      data: null,
      error: new Error('key boom'),
    } as never);

    await expect(setup({ 'env-file': envPath() })).rejects.toThrow(/key boom/);

    expect(removeBucket).toHaveBeenCalledTimes(1);
    expect(assignBucketRoles).not.toHaveBeenCalled();
    expect(existsSync(envPath())).toBe(false);
  });

  it('rolls back the bucket if role assignment fails', async () => {
    vi.mocked(assignBucketRoles).mockResolvedValue({
      error: new Error('assign boom'),
    } as never);

    await expect(setup({ 'env-file': envPath() })).rejects.toThrow(
      /assign boom/
    );

    expect(removeBucket).toHaveBeenCalledTimes(1);
    expect(existsSync(envPath())).toBe(false);
  });
});
