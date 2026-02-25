import { getLoginMethod } from '../../auth/s3-client.js';
import { getAuthClient } from '../../auth/client.js';
import { getSelectedOrganization } from '../../auth/storage.js';
import { getTigrisConfig } from '../../auth/config.js';

export interface IAMConfig {
  sessionToken: string;
  organizationId: string | undefined;
  iamEndpoint: string;
  mgmtEndpoint: string;
}

/**
 * Shared OAuth guard + IAM config helper for TUI data modules.
 * Eliminates boilerplate from every IAM operation.
 */
export async function getIAMConfig(): Promise<IAMConfig> {
  const loginMethod = await getLoginMethod();

  if (loginMethod !== 'oauth') {
    throw new Error(
      'This feature requires OAuth login. Exit and run "tigris login oauth" first.'
    );
  }

  const authClient = getAuthClient();
  const isAuthed = await authClient.isAuthenticated();

  if (!isAuthed) {
    throw new Error(
      'Not authenticated. Exit and run "tigris login oauth" first.'
    );
  }

  const accessToken = await authClient.getAccessToken();
  const selectedOrg = getSelectedOrganization();
  const tigrisConfig = getTigrisConfig();

  return {
    sessionToken: accessToken,
    organizationId: selectedOrg ?? undefined,
    iamEndpoint: tigrisConfig.iamEndpoint,
    mgmtEndpoint: tigrisConfig.mgmtEndpoint,
  };
}
