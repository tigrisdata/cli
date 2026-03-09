import { formatOutput } from '../../utils/format.js';
import { getLoginMethod } from '../../auth/s3-client.js';
import { getAuthClient } from '../../auth/client.js';
import { getSelectedOrganization } from '../../auth/storage.js';
import { getTigrisConfig } from '../../auth/config.js';
import { listAccessKeys } from '@tigrisdata/iam';
import {
  printStart,
  printSuccess,
    printEmpty,
  msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('access-keys', 'list');

export default async function list() {
  printStart(context);

  const loginMethod = await getLoginMethod();

  if (loginMethod !== 'oauth') {
    handleError({ message: 'Access keys can only be listed when logged in via OAuth.\nRun "tigris login oauth" first.' });
  }

  const authClient = getAuthClient();
  const isAuthenticated = await authClient.isAuthenticated();

  if (!isAuthenticated) {
    handleError({ message: 'Not authenticated. Run "tigris login oauth" first.' });
  }

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
    if (isJsonMode()) {
      jsonSuccess({ accessKeys: [] });
      return;
    }
    printEmpty(context);
    return;
  }

  const keys = data.accessKeys.map((key) => ({
    name: key.name,
    id: key.id,
    status: key.status,
    created: key.createdAt,
  }));

  if (isJsonMode()) {
    jsonSuccess({ accessKeys: keys });
    return;
  }

  const output = formatOutput(keys, 'table', 'keys', 'key', [
    { key: 'name', header: 'Name' },
    { key: 'id', header: 'ID' },
    { key: 'status', header: 'Status' },
    { key: 'created', header: 'Created' },
  ]);

  console.log(output);
  printSuccess(context, { count: keys.length });
}
