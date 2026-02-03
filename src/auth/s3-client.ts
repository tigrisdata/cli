/**
 * S3 Client factory
 * Creates appropriate S3 client based on login method
 */

import { S3Client } from '@aws-sdk/client-s3';
import type { HttpRequest } from '@aws-sdk/types';
import { fromIni } from '@aws-sdk/credential-providers';
import {
  getLoginMethod as getStoredLoginMethod,
  getCredentials,
  getEnvCredentials,
  hasAwsProfile,
  getAwsProfileConfig,
  getSelectedOrganization,
} from './storage.js';
import { getAuthClient } from './client.js';
import { getAuth0Config, getTigrisConfig } from './config.js';

const tigrisConfig = getTigrisConfig();
const auth0Config = getAuth0Config();

export type LoginMethod = 'oauth' | 'credentials';

/**
 * Get the login method used by the user
 */
export async function getLoginMethod(): Promise<LoginMethod | null> {
  return getStoredLoginMethod();
}

export type TigrisStorageConfig = {
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  sessionToken?: string;
  organizationId?: string;
  iamEndpoint?: string;
  authDomain?: string;
};

export async function getStorageConfig(): Promise<TigrisStorageConfig> {
  // 1. AWS profile (only if AWS_PROFILE is set)
  if (hasAwsProfile()) {
    const profile = process.env.AWS_PROFILE || 'default';
    const profileConfig = await getAwsProfileConfig(profile);
    const resolved = await fromIni({ profile })();
    return {
      accessKeyId: resolved.accessKeyId,
      secretAccessKey: resolved.secretAccessKey,
      endpoint: profileConfig.endpoint || 'https://t3.storage.dev',
      iamEndpoint: profileConfig.iamEndpoint,
    };
  }

  // 2. Login (oauth or credentials)
  const loginMethod = await getLoginMethod();

  if (loginMethod === 'oauth') {
    const authClient = getAuthClient();
    const accessToken = await authClient.getAccessToken();
    const selectedOrg = getSelectedOrganization();

    if (!selectedOrg) {
      throw new Error(
        'No organization selected. Please run "tigris orgs select" first.'
      );
    }

    const endpoint = tigrisConfig.endpoint;
    const iamEndpoint = tigrisConfig.iamEndpoint;
    const authDomain = auth0Config.domain;

    return {
      sessionToken: accessToken,
      accessKeyId: '',
      secretAccessKey: '',
      endpoint,
      organizationId: getSelectedOrganization() ?? undefined,
      iamEndpoint,
      authDomain,
    };
  }

  if (loginMethod === 'credentials') {
    const loginCredentials = getCredentials();
    if (loginCredentials) {
      return {
        accessKeyId: loginCredentials.accessKeyId,
        secretAccessKey: loginCredentials.secretAccessKey,
        endpoint: loginCredentials.endpoint,
      };
    }
  }

  // 3. Env vars
  const envCredentials = getEnvCredentials();
  if (envCredentials) {
    return {
      accessKeyId: envCredentials.accessKeyId,
      secretAccessKey: envCredentials.secretAccessKey,
      endpoint: envCredentials.endpoint,
    };
  }

  // 4. Configured credentials
  const credentials = getCredentials();

  if (credentials) {
    return {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      endpoint: credentials.endpoint,
    };
  }

  // No valid auth method found
  throw new Error(
    'Not authenticated. Please run "tigris login" or "tigris configure" first.'
  );
}

/**
 * Get configured S3 client based on login method
 */
export async function getS3Client(): Promise<S3Client> {
  // 1. AWS profile (only if AWS_PROFILE is set)
  if (hasAwsProfile()) {
    const profile = process.env.AWS_PROFILE || 'default';
    const profileConfig = await getAwsProfileConfig(profile);
    const client = new S3Client({
      region: 'auto',
      endpoint: profileConfig.endpoint || 'https://t3.storage.dev',
      credentials: fromIni({ profile }),
    });

    return client;
  }

  // 2. Login (oauth or credentials)
  const loginMethod = await getLoginMethod();

  if (loginMethod === 'oauth') {
    const authClient = getAuthClient();
    const accessToken = await authClient.getAccessToken();
    const selectedOrg = getSelectedOrganization();

    if (!selectedOrg) {
      throw new Error(
        'No organization selected. Please run "tigris orgs select" first.'
      );
    }

    const endpoint = tigrisConfig.endpoint;

    const client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        sessionToken: accessToken,
        accessKeyId: '', // Required by SDK but not used with token auth
        secretAccessKey: '', // Required by SDK but not used with token auth
      },
    });

    // Add middleware to inject custom headers
    client.middlewareStack.add(
      (next) => async (args) => {
        const req = args.request as HttpRequest;
        req.headers['x-Tigris-Namespace'] = selectedOrg;
        const result = await next(args);
        return result;
      },
      {
        name: 'x-Tigris-Namespace-Middleware',
        step: 'build',
        override: true,
      }
    );

    return client;
  }

  if (loginMethod === 'credentials') {
    const loginCredentials = getCredentials();
    if (loginCredentials) {
      const client = new S3Client({
        region: 'auto',
        endpoint: loginCredentials.endpoint,
        credentials: {
          accessKeyId: loginCredentials.accessKeyId,
          secretAccessKey: loginCredentials.secretAccessKey,
        },
      });

      return client;
    }
  }

  // 3. Env vars
  const envCredentials = getEnvCredentials();
  if (envCredentials) {
    const client = new S3Client({
      region: 'auto',
      endpoint: envCredentials.endpoint,
      credentials: {
        accessKeyId: envCredentials.accessKeyId,
        secretAccessKey: envCredentials.secretAccessKey,
      },
    });

    return client;
  }

  // 4. Configured credentials
  const credentials = getCredentials();

  if (credentials) {
    const client = new S3Client({
      region: 'auto',
      endpoint: credentials.endpoint,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    return client;
  }

  // No valid auth method found
  throw new Error(
    'Not authenticated. Please run "tigris login" or "tigris configure" first.'
  );
}

/**
 * Check if user is authenticated (either method)
 */
export async function isAuthenticated(): Promise<boolean> {
  return (
    hasAwsProfile() ||
    (await getLoginMethod()) !== null ||
    getEnvCredentials() !== null ||
    getCredentials() !== null
  );
}
