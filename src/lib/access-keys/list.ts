import { listAccessKeys } from '@tigrisdata/iam';
import { exitWithError } from '@utils/exit.js';
import { formatOutput } from '@utils/format.js';
import {
  msg,
  printEmpty,
  printFailure,
  printStart,
  printSuccess,
} from '@utils/messages.js';
import { getOption } from '@utils/options.js';

import { getAuthClient } from '@auth/client.js';
import { getLoginMethod, getTigrisConfig } from '@auth/provider.js';
import { getSelectedOrganization } from '@auth/storage.js';

const context = msg('access-keys', 'list');

export default async function list(options: Record<string, unknown>) {
  printStart(context);

  const json = getOption<boolean>(options, ['json']);
  const format = json
    ? 'json'
    : getOption<string>(options, ['format', 'f', 'F'], 'table');

  const loginMethod = await getLoginMethod();

  if (loginMethod !== 'oauth') {
    printFailure(
      context,
      'Access keys can only be listed when logged in via OAuth.\nRun "tigris login oauth" first.'
    );
    exitWithError(
      'Access keys can only be listed when logged in via OAuth.\nRun "tigris login oauth" first.',
      context
    );
  }

  const authClient = getAuthClient();
  const isAuthenticated = await authClient.isAuthenticated();

  if (!isAuthenticated) {
    printFailure(context, 'Not authenticated. Run "tigris login oauth" first.');
    exitWithError(
      'Not authenticated. Run "tigris login oauth" first.',
      context
    );
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
    printFailure(context, error.message);
    exitWithError(error, context);
  }

  if (!data.accessKeys || data.accessKeys.length === 0) {
    printEmpty(context);
    return;
  }

  const keys = data.accessKeys.map((key) => ({
    name: key.name,
    id: key.id,
    status: key.status,
    created: key.createdAt,
  }));

  const output = formatOutput(keys, format!, 'keys', 'key', [
    { key: 'name', header: 'Name' },
    { key: 'id', header: 'ID' },
    { key: 'status', header: 'Status' },
    { key: 'created', header: 'Created' },
  ]);

  console.log(output);
  printSuccess(context, { count: keys.length });
}
