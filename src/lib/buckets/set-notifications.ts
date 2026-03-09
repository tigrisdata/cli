import { getOption } from '../../utils/options.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { getSelectedOrganization } from '../../auth/storage.js';
import {
  setBucketNotifications,
  type BucketNotification,
} from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
  msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('buckets', 'set-notifications');

export default async function setNotifications(
  options: Record<string, unknown>
) {
  printStart(context);

  const name = getOption<string>(options, ['name']);
  const url = getOption<string>(options, ['url']);
  const filter = getOption<string>(options, ['filter']);
  const token = getOption<string>(options, ['token']);
  const username = getOption<string>(options, ['username']);
  const password = getOption<string>(options, ['password']);
  const enable = getOption<boolean>(options, ['enable']);
  const disable = getOption<boolean>(options, ['disable']);
  const reset = getOption<boolean>(options, ['reset']);

  if (!name) {
    handleError({ message: 'Bucket name is required' });
  }

  const flagCount = [enable, disable, reset].filter(Boolean).length;
  if (flagCount > 1) {
    handleError({ message: 'Only one of --enable, --disable, or --reset can be used' });
  }

  if (
    reset &&
    (url !== undefined ||
      filter !== undefined ||
      token !== undefined ||
      username !== undefined ||
      password !== undefined)
  ) {
    handleError({ message: 'Cannot use --reset with other options' });
  }

  if (
    !enable &&
    !disable &&
    !reset &&
    url === undefined &&
    filter === undefined &&
    token === undefined &&
    username === undefined &&
    password === undefined
  ) {
    handleError({ message: 'Provide at least one option' });
  }

  if (token && (username !== undefined || password !== undefined)) {
    handleError({ message: 'Cannot use --token with --username/--password. Choose one auth method' });
  }

  if (
    (username !== undefined && password === undefined) ||
    (username === undefined && password !== undefined)
  ) {
    handleError({ message: 'Both --username and --password are required' });
  }

  const config = await getStorageConfig();
  const selectedOrg = getSelectedOrganization();
  const finalConfig = {
    ...config,
    ...(selectedOrg && !config.organizationId
      ? { organizationId: selectedOrg }
      : {}),
  };

  let notificationConfig: BucketNotification;

  if (reset) {
    notificationConfig = {};
  } else {
    notificationConfig = {
      ...(enable ? { enabled: true } : {}),
      ...(disable ? { enabled: false } : {}),
      ...(url !== undefined ? { url } : {}),
      ...(filter !== undefined ? { filter } : {}),
    };

    if (token) {
      notificationConfig = { ...notificationConfig, auth: { token } };
    } else if (username && password) {
      notificationConfig = {
        ...notificationConfig,
        auth: { username, password },
      };
    }
  }

  const { error } = await setBucketNotifications(name, {
    notificationConfig,
    config: finalConfig,
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({ name, action: 'notifications_updated' });
  }
  printSuccess(context, { name });
}
