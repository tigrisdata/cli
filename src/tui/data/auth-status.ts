import { isAuthenticated, getLoginMethod } from '../../auth/s3-client.js';
import { getAuthClient } from '../../auth/client.js';
import {
  getSelectedOrganization,
  getOrganizations,
  getCredentials,
  getLoginMethod as getStoredLoginMethod,
} from '../../auth/storage.js';

export interface AuthInfo {
  authenticated: boolean;
  loginMethod: string | null;
  email?: string;
  userId?: string;
  orgName?: string;
  orgId?: string;
}

export async function fetchAuthStatus(): Promise<AuthInfo> {
  const authed = await isAuthenticated();

  if (!authed) {
    return { authenticated: false, loginMethod: null };
  }

  const loginMethod = await getLoginMethod();
  const storedLoginMethod = getStoredLoginMethod();

  if (storedLoginMethod === 'oauth') {
    const authClient = getAuthClient();
    const isOAuthValid = await authClient.isAuthenticated();

    if (!isOAuthValid) {
      return { authenticated: false, loginMethod: 'oauth' };
    }

    try {
      const claims = await authClient.getIdTokenClaims();
      const selectedOrg = getSelectedOrganization();
      const organizations = getOrganizations();
      const org = organizations.find((o) => o.id === selectedOrg);

      return {
        authenticated: true,
        loginMethod: loginMethod ?? 'oauth',
        email: claims.email,
        userId: claims.sub,
        orgName: org?.name ?? org?.displayName,
        orgId: selectedOrg ?? undefined,
      };
    } catch {
      return { authenticated: true, loginMethod: loginMethod ?? 'oauth' };
    }
  }

  const credentials = getCredentials();
  if (credentials) {
    return {
      authenticated: true,
      loginMethod: loginMethod ?? 'credentials',
      userId: credentials.accessKeyId,
    };
  }

  return { authenticated: true, loginMethod: loginMethod ?? 'unknown' };
}
