import { removeAccessKey } from '@tigrisdata/iam';
import { exitWithError } from '@utils/exit.js';
import { confirm, requireInteractive } from '@utils/interactive.js';
import {
  msg,
  printFailure,
  printStart,
  printSuccess,
} from '@utils/messages.js';
import { getOption } from '@utils/options.js';

import { getAuthClient } from '@auth/client.js';
import { getLoginMethod, getTigrisConfig } from '@auth/provider.js';
import { getSelectedOrganization } from '@auth/storage.js';

const context = msg('access-keys', 'delete');

export default async function remove(options: Record<string, unknown>) {
  printStart(context);

  const json = getOption<boolean>(options, ['json']);
  const format = json
    ? 'json'
    : getOption<string>(options, ['format', 'f', 'F'], 'table');

  const id = getOption<string>(options, ['id']);
  const force = getOption<boolean>(options, ['force', 'yes', 'y']);

  if (!id) {
    printFailure(context, 'Access key ID is required');
    exitWithError('Access key ID is required', context);
  }

  const loginMethod = await getLoginMethod();

  if (loginMethod !== 'oauth') {
    printFailure(
      context,
      'Access keys can only be deleted when logged in via OAuth.\nRun "tigris login oauth" first.'
    );
    exitWithError(
      'Access keys can only be deleted when logged in via OAuth.\nRun "tigris login oauth" first.',
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

  if (!force) {
    requireInteractive('Use --yes to skip confirmation');
    const confirmed = await confirm(`Delete access key '${id}'?`);
    if (!confirmed) {
      console.log('Aborted');
      return;
    }
  }

  const accessToken = await authClient.getAccessToken();
  const selectedOrg = getSelectedOrganization();
  const tigrisConfig = getTigrisConfig();

  const { error } = await removeAccessKey(id, {
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

  if (format === 'json') {
    console.log(JSON.stringify({ action: 'deleted', id }));
  }

  printSuccess(context);
}
