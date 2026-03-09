import { getOption } from '../../utils/options.js';
import { getLoginMethod } from '../../auth/s3-client.js';
import { getAuthClient } from '../../auth/client.js';
import { getSelectedOrganization } from '../../auth/storage.js';
import { getTigrisConfig } from '../../auth/config.js';
import { createAccessKey } from '@tigrisdata/iam';
import {
  printStart,
  printSuccess,
    msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('access-keys', 'create');

export default async function create(options: Record<string, unknown>) {
  printStart(context);

  const name = getOption<string>(options, ['name']);

  if (!name) {
    handleError({ message: 'Access key name is required' });
  }

  const loginMethod = await getLoginMethod();

  if (loginMethod !== 'oauth') {
    handleError({ message: 'Access keys can only be created when logged in via OAuth.\nRun "tigris login oauth" first.' });
  }

  const authClient = getAuthClient();
  const isAuthenticated = await authClient.isAuthenticated();

  if (!isAuthenticated) {
    handleError({ message: 'Not authenticated. Run "tigris login oauth" first.' });
  }

  const accessToken = await authClient.getAccessToken();
  const selectedOrg = getSelectedOrganization();
  const tigrisConfig = getTigrisConfig();

  const { data, error } = await createAccessKey(name, {
    config: {
      sessionToken: accessToken,
      organizationId: selectedOrg ?? undefined,
      iamEndpoint: tigrisConfig.iamEndpoint,
    },
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({ name: data.name, id: data.id, secret: data.secret });
    return;
  }

  console.log(`  Name: ${data.name}`);
  console.log(`  Access Key ID: ${data.id}`);
  console.log(`  Secret Access Key: ${data.secret}`);
  console.log('');
  console.log(
    '  Save these credentials securely. The secret will not be shown again.'
  );

  printSuccess(context);
}
