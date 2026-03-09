import { getOption } from '../../utils/options.js';
import { getLoginMethod } from '../../auth/s3-client.js';
import { getAuthClient } from '../../auth/client.js';
import { getSelectedOrganization } from '../../auth/storage.js';
import { getTigrisConfig } from '../../auth/config.js';
import { assignBucketRoles, revokeAllBucketRoles } from '@tigrisdata/iam';
import {
  printStart,
  printSuccess,
    msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('access-keys', 'assign');

type Role = 'Editor' | 'ReadOnly' | 'NamespaceAdmin';
const validRoles: Role[] = ['Editor', 'ReadOnly', 'NamespaceAdmin'];

function normalizeToArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function assign(options: Record<string, unknown>) {
  printStart(context);

  const id = getOption<string>(options, ['id']);
  const admin = getOption<boolean>(options, ['admin']);
  const revokeRoles = getOption<boolean>(options, [
    'revokeRoles',
    'revoke-roles',
  ]);
  const buckets = normalizeToArray(
    getOption<string | string[]>(options, ['bucket', 'b'])
  );
  const roles = normalizeToArray(
    getOption<string | string[]>(options, ['role', 'r'])
  );

  if (!id) {
    handleError({ message: 'Access key ID is required' });
  }

  if (admin && revokeRoles) {
    handleError({ message: 'Cannot use --admin and --revoke-roles together' });
  }

  const loginMethod = await getLoginMethod();

  if (loginMethod !== 'oauth') {
    handleError({ message: 'Bucket roles can only be managed when logged in via OAuth.\nRun "tigris login oauth" first.' });
  }

  const authClient = getAuthClient();
  const isAuthenticated = await authClient.isAuthenticated();

  if (!isAuthenticated) {
    handleError({ message: 'Not authenticated. Run "tigris login oauth" first.' });
  }

  const accessToken = await authClient.getAccessToken();
  const selectedOrg = getSelectedOrganization();
  const tigrisConfig = getTigrisConfig();

  const config = {
    sessionToken: accessToken,
    organizationId: selectedOrg ?? undefined,
    iamEndpoint: tigrisConfig.iamEndpoint,
  };

  if (revokeRoles) {
    const { error } = await revokeAllBucketRoles(id, { config });

    if (error) {
      handleError(error);
    }

    if (isJsonMode()) {
      jsonSuccess({ id, action: 'revoke_all' });
      return;
    }
    printSuccess(context);
    return;
  }

  let assignments: { bucket: string; role: Role }[];

  if (admin) {
    // Admin access: grant NamespaceAdmin to all buckets
    assignments = [{ bucket: '*', role: 'NamespaceAdmin' }];
  } else {
    if (buckets.length === 0) {
      handleError({ message: 'At least one bucket name is required (or use --admin or --revoke-roles)' });
    }

    if (roles.length === 0) {
      handleError({ message: 'At least one role is required (or use --admin or --revoke-roles)' });
    }

    // Validate all roles
    for (const role of roles) {
      if (!validRoles.includes(role as Role)) {
        handleError({ message: `Invalid role "${role}". Valid roles are: ${validRoles.join(', ')}` });
      }
    }

    // Build role assignments
    if (roles.length === 1) {
      // Single role applies to all buckets
      assignments = buckets.map((bucket) => ({
        bucket,
        role: roles[0] as Role,
      }));
    } else if (roles.length === buckets.length) {
      // Pair buckets with roles
      assignments = buckets.map((bucket, i) => ({
        bucket,
        role: roles[i] as Role,
      }));
    } else {
      handleError({ message: `Number of roles (${roles.length}) must be 1 or match number of buckets (${buckets.length})` });
    }
  }

  const { error } = await assignBucketRoles(id, assignments, { config });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({ id, assignments });
    return;
  }
  printSuccess(context);
}
