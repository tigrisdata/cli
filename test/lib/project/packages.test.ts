import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mocks (hoisted) --------------------------------------------------------

vi.mock('../../../src/lib/project/exec.js', () => ({
  run: vi.fn(async () => {}),
}));

import { run } from '../../../src/lib/project/exec.js';
import {
  installProjectPackages,
  PROJECT_PACKAGES,
} from '../../../src/lib/project/packages.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(run).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('installProjectPackages', () => {
  it('runs npm install for the project packages in the project dir', async () => {
    const result = await installProjectPackages('/tmp/project');

    expect(run).toHaveBeenCalledTimes(1);
    const [command, args, options] = vi.mocked(run).mock.calls[0];
    expect(command).toBe('npm');
    expect(args).toEqual(['install', ...PROJECT_PACKAGES]);
    expect((options as { cwd: string }).cwd).toBe('/tmp/project');

    expect(result.installed).toEqual([...PROJECT_PACKAGES]);
    expect(result.error).toBeUndefined();
  });

  it('runs npm silently when quiet is set', async () => {
    await installProjectPackages('/tmp/project', { quiet: true });
    const [, , options] = vi.mocked(run).mock.calls[0];
    expect((options as { stdio: string }).stdio).toBe('ignore');
  });

  it('captures the error instead of throwing when npm fails', async () => {
    vi.mocked(run).mockRejectedValue(new Error('npm not found'));

    const result = await installProjectPackages('/tmp/project');

    expect(result.installed).toEqual([]);
    expect(result.error).toBe('npm not found');
  });

  it('installs the storage SDK and the agent kit', () => {
    expect(PROJECT_PACKAGES).toContain('@tigrisdata/storage');
    expect(PROJECT_PACKAGES).toContain('@tigrisdata/agent-kit');
  });
});
