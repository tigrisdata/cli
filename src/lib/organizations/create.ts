import { createOrganization } from '@tigrisdata/iam';
import { getOption } from '../../utils/options.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import {
  getLoginMethod,
  getCredentials,
  getSelectedOrganization,
} from '../../auth/storage.js';
import { isFlyUser } from '../../auth/fly.js';
import {
  printStart,
  printSuccess,
    printHint,
  msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('organizations', 'create');

export default async function create(options: Record<string, unknown>) {
  printStart(context);

  // Check if logged in with OAuth (required for org creation)
  const loginMethod = getLoginMethod();
  if (loginMethod !== 'oauth') {
    // Not logged in via OAuth - check if using credentials
    if (getCredentials()) {
      console.log(
        'You are using access key credentials, which belong to a single organization.\n' +
          'Organization creation is only available with OAuth login.\n\n' +
          'Run "tigris login" to login with your Tigris account.'
      );
    } else {
      console.log(
        'Not authenticated. Please run "tigris login" to login with your Tigris account.'
      );
    }
    return;
  }

  // Fly users cannot create organizations
  const selectedOrg = getSelectedOrganization();
  if (isFlyUser(selectedOrg ?? undefined)) {
    console.log(
      'Organization creation is not available for Fly.io users.\n' +
        'Your organizations are managed through Fly.io.\n\n' +
        'Visit https://fly.io to manage your organizations.'
    );
    return;
  }

  const name = getOption<string>(options, ['name', 'N']);

  if (!name) {
    handleError({ message: 'Organization name is required' });
  }

  const config = await getStorageConfig();

  const { data, error } = await createOrganization(name, { config });

  if (error) {
    handleError(error);
  }

  const id = data.id;

  if (isJsonMode()) {
    jsonSuccess({ name, id });
    return;
  }
  printSuccess(context, { name, id });
  printHint(context, { name });
}
