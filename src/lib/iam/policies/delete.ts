import enquirer from 'enquirer';
const { prompt } = enquirer;
import { getOption } from '../../../utils/options.js';
import { getLoginMethod } from '../../../auth/s3-client.js';
import { getAuthClient } from '../../../auth/client.js';
import { getSelectedOrganization } from '../../../auth/storage.js';
import { getTigrisConfig } from '../../../auth/config.js';
import { deletePolicy, listPolicies } from '@tigrisdata/iam';
import {
  printStart,
  printSuccess,
    printEmpty,
  msg,
} from '../../../utils/messages.js';
import { handleError } from '../../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../../utils/output.js';

const context = msg('iam policies', 'delete');

export default async function del(options: Record<string, unknown>) {
  printStart(context);

  let resource = getOption<string>(options, ['resource']);

  const loginMethod = await getLoginMethod();

  if (loginMethod !== 'oauth') {
    handleError({ message: 'Policies can only be deleted when logged in via OAuth.\nRun "tigris login oauth" first.' });
  }

  const authClient = getAuthClient();
  const isAuthenticated = await authClient.isAuthenticated();

  if (!isAuthenticated) {
    handleError({ message: 'Not authenticated. Run "tigris login oauth" first.' });
  }

  const accessToken = await authClient.getAccessToken();
  const selectedOrg = getSelectedOrganization();
  const tigrisConfig = getTigrisConfig();

  const iamConfig = {
    sessionToken: accessToken,
    organizationId: selectedOrg ?? undefined,
    iamEndpoint: tigrisConfig.iamEndpoint,
  };

  // If no resource provided, list policies and let user select
  if (!resource) {
    const { data: listData, error: listError } = await listPolicies({
      config: iamConfig,
    });

    if (listError) {
      handleError(listError);
    }

    if (!listData.policies || listData.policies.length === 0) {
      printEmpty(context);
      return;
    }

    const { selected } = await prompt<{ selected: string }>({
      type: 'select',
      name: 'selected',
      message: 'Select a policy to delete:',
      choices: listData.policies.map((p) => ({
        name: p.resource,
        message: `${p.name} (${p.resource})`,
      })),
    });

    resource = selected;
  }

  const { error } = await deletePolicy(resource, {
    config: iamConfig,
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({ resource, action: 'deleted' });
    return;
  }
  printSuccess(context, { resource });
}
