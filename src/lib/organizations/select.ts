import { listOrganizations } from '@tigrisdata/iam';
import { getOption } from '../../utils/options.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import {
  storeSelectedOrganization,
  getLoginMethod,
  getCredentials,
} from '../../auth/storage.js';
import {
  printStart,
  printSuccess,
    msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('organizations', 'select');

export default async function select(options: Record<string, unknown>) {
  printStart(context);

  // Check if logged in with OAuth (required for org selection)
  const loginMethod = getLoginMethod();
  if (loginMethod !== 'oauth') {
    // Not logged in via OAuth - check if using credentials
    if (getCredentials()) {
      console.log(
        'You are using access key credentials, which belong to a single organization.\n' +
          'Organization selection is only available with OAuth login.\n\n' +
          'Run "tigris login" to login with your Tigris account.'
      );
    } else {
      console.log(
        'Not authenticated. Please run "tigris login" to login with your Tigris account.'
      );
    }
    return;
  }

  const name = getOption<string>(options, ['name', 'N']);

  if (!name) {
    handleError({ message: 'Organization name or ID is required' });
  }

  const config = await getStorageConfig();

  const { data, error } = await listOrganizations({ config });

  if (error) {
    handleError(error);
  }

  const orgs = data?.organizations ?? [];

  // Find organization by name or ID
  const org = orgs.find((o) => o.id === name || o.name === name);

  if (!org) {
    const availableOrgs = orgs
      .map((o) => `   - ${o.name} (${o.id})`)
      .join('\n');
    handleError({ message: `Organization "${name}" not found\n\nAvailable organizations:\n${availableOrgs}` });
  }

  // Store selected organization
  await storeSelectedOrganization(org.id);

  if (isJsonMode()) {
    jsonSuccess({ id: org.id, name: org.name });
    return;
  }
  printSuccess(context, { name: org.name });
}
