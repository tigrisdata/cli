import enquirer from 'enquirer';
const { prompt } = enquirer;
import { getOption } from '../../../utils/options.js';
import { getLoginMethod } from '../../../auth/s3-client.js';
import { getAuthClient } from '../../../auth/client.js';
import { getSelectedOrganization } from '../../../auth/storage.js';
import { getTigrisConfig } from '../../../auth/config.js';
import { isFlyUser } from '../../../auth/fly.js';
import { revokeInvitation as revokeInv, listUsers } from '@tigrisdata/iam';
import {
  printStart,
  printSuccess,
    printEmpty,
  msg,
} from '../../../utils/messages.js';
import { handleError } from '../../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../../utils/output.js';

const context = msg('iam users', 'revoke-invitation');

export default async function revokeInvitation(
  options: Record<string, unknown>
) {
  printStart(context);

  const resourceOption = getOption<string | string[]>(options, ['resource']);

  const loginMethod = await getLoginMethod();

  if (loginMethod !== 'oauth') {
    handleError({ message: 'Invitations can only be revoked when logged in via OAuth.\nRun "tigris login oauth" first.' });
  }

  const selectedOrg = getSelectedOrganization();

  if (isFlyUser(selectedOrg ?? undefined)) {
    console.log(
      'User management is not available for Fly.io organizations.\n' +
        'Your users are managed through Fly.io.\n\n' +
        'Visit https://fly.io to manage your organization members.'
    );
    return;
  }

  const authClient = getAuthClient();
  const isAuthenticated = await authClient.isAuthenticated();

  if (!isAuthenticated) {
    handleError({ message: 'Not authenticated. Run "tigris login oauth" first.' });
  }

  const accessToken = await authClient.getAccessToken();
  const tigrisConfig = getTigrisConfig();

  const iamConfig = {
    sessionToken: accessToken,
    organizationId: selectedOrg ?? undefined,
    iamEndpoint: tigrisConfig.iamEndpoint,
    mgmtEndpoint: tigrisConfig.mgmtEndpoint,
  };

  let resources = Array.isArray(resourceOption)
    ? resourceOption
    : resourceOption
      ? [resourceOption]
      : [];

  // If no resource provided, list invitations and let user select
  if (resources.length === 0) {
    const { data: listData, error: listError } = await listUsers({
      config: iamConfig,
    });

    if (listError) {
      handleError(listError);
    }

    if (listData.invitations.length === 0) {
      printEmpty(context);
      return;
    }

    const { selected } = await prompt<{ selected: string[] }>({
      type: 'multiselect',
      name: 'selected',
      message:
        'Select invitation(s) to revoke (space to select, enter to confirm):',
      choices: listData.invitations.map((inv) => ({
        name: inv.id,
        message: `${inv.email} (${inv.role} - ${inv.status})`,
      })),
    });

    resources = selected;
  }

  const { error } = await revokeInv(resources, {
    config: iamConfig,
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({ revoked: resources });
    return;
  }
  printSuccess(context);
}
