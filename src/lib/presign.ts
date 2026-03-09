import { parseAnyPath } from '../utils/path.js';
import { getOption } from '../utils/options.js';
import { getStorageConfig, getLoginMethod } from '../auth/s3-client.js';
import { getPresignedUrl } from '@tigrisdata/storage';
import { listAccessKeys } from '@tigrisdata/iam';
import type { AccessKey } from '@tigrisdata/iam';
import { getAuthClient } from '../auth/client.js';
import { getSelectedOrganization } from '../auth/storage.js';
import { getTigrisConfig } from '../auth/config.js';
import { formatJson } from '../utils/format.js';
import enquirer from 'enquirer';
import { handleError } from '../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../utils/output.js';
const { prompt } = enquirer;

export default async function presign(options: Record<string, unknown>) {
  const pathString = getOption<string>(options, ['path']);

  if (!pathString) {
    handleError({ message: 'path argument is required' });
  }

  const { bucket, path } = parseAnyPath(pathString);

  if (!bucket) {
    handleError({ message: 'Invalid path' });
  }

  if (!path) {
    handleError({ message: 'Object key is required' });
  }

  const method = getOption<string>(options, ['method', 'm']) ?? 'get';
  const expiresIn = parseInt(
    getOption<string>(options, ['expires-in', 'expiresIn', 'e']) ?? '3600',
    10
  );
  const format = getOption<string>(options, ['format', 'f']) ?? 'url';
  const accessKeyFlag = getOption<string>(options, ['access-key', 'accessKey']);

  const config = await getStorageConfig();

  // Resolve access key ID
  let accessKeyId: string | undefined;

  if (accessKeyFlag) {
    // 1. Explicit --access-key flag
    accessKeyId = accessKeyFlag;
  } else if (config.accessKeyId) {
    // 2. Credentials/env/configured login has an access key
    accessKeyId = config.accessKeyId;
  } else {
    // 3. OAuth login — need to resolve an access key interactively
    const loginMethod = await getLoginMethod();

    if (loginMethod !== 'oauth') {
      handleError({
        message: 'Presigning requires an access key. Pass --access-key or configure credentials.',
      });
    }

    accessKeyId = await resolveAccessKeyInteractively(bucket);
  }

  if (!accessKeyId) {
    handleError({
      message: 'Presigning requires an access key. Pass --access-key or configure credentials.',
    });
  }

  const { data, error } = await getPresignedUrl(path, {
    method: method as 'get' | 'put',
    expiresIn,
    accessKeyId,
    config: {
      ...config,
      bucket,
    },
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({
      url: data.url,
      expiresIn: data.expiresIn,
      method,
      bucket,
      key: path,
    });
    return;
  }

  if (format === 'json') {
    console.log(
      formatJson({
        url: data.url,
        expiresIn: data.expiresIn,
        method,
        bucket,
        key: path,
      })
    );
  } else {
    console.log(data.url);
  }
}

async function resolveAccessKeyInteractively(
  targetBucket: string
): Promise<string> {
  if (!process.stdin.isTTY) {
    handleError({
      message: 'Presigning requires an access key. Pass --access-key tid_...',
    });
  }

  const authClient = getAuthClient();
  const accessToken = await authClient.getAccessToken();
  const selectedOrg = getSelectedOrganization();
  const tigrisConfig = getTigrisConfig();

  const { data, error } = await listAccessKeys({
    config: {
      sessionToken: accessToken,
      organizationId: selectedOrg ?? undefined,
      iamEndpoint: tigrisConfig.iamEndpoint,
    },
  });

  if (error) {
    handleError(error);
  }

  if (!data.accessKeys || data.accessKeys.length === 0) {
    handleError({
      message: 'No access keys found. Create one with "tigris access-keys create <name>"',
    });
  }

  // Filter to active keys that have access to the target bucket
  const matchingKeys = data.accessKeys.filter(
    (key: AccessKey) =>
      key.status === 'active' &&
      key.roles?.some((r) => r.bucket === targetBucket || r.bucket === '*')
  );

  let candidates: AccessKey[];

  if (matchingKeys.length > 0) {
    candidates = matchingKeys;
  } else {
    // Fall back to all active keys with a warning
    const activeKeys = data.accessKeys.filter(
      (key: AccessKey) => key.status === 'active'
    );

    if (activeKeys.length === 0) {
      handleError({
        message: 'No active access keys found. Create one with "tigris access-keys create <name>"',
      });
    }

    console.error(
      `No access keys with explicit access to bucket "${targetBucket}" found. Showing all active keys.`
    );
    candidates = activeKeys;
  }

  // Auto-select if only one candidate
  if (candidates.length === 1) {
    console.error(
      `Using access key: ${candidates[0].name} (${candidates[0].id})`
    );
    return candidates[0].id;
  }

  // Interactive selection
  const { selectedKey } = await prompt<{ selectedKey: string }>({
    type: 'select',
    name: 'selectedKey',
    message: 'Select an access key for presigning:',
    choices: candidates.map((key: AccessKey) => ({
      name: key.id,
      message: `${key.name} (${key.id})`,
    })),
  });

  return selectedKey;
}
