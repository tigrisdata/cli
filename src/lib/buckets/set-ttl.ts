import { getOption } from '../../utils/options.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { getSelectedOrganization } from '../../auth/storage.js';
import { setBucketTtl } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
  msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('buckets', 'set-ttl');

export default async function setTtl(options: Record<string, unknown>) {
  printStart(context);

  const name = getOption<string>(options, ['name']);
  const days = getOption<string>(options, ['days']);
  const date = getOption<string>(options, ['date']);
  const enable = getOption<boolean>(options, ['enable']);
  const disable = getOption<boolean>(options, ['disable']);

  if (!name) {
    handleError({ message: 'Bucket name is required' });
  }

  if (enable && disable) {
    handleError({ message: 'Cannot use both --enable and --disable' });
  }

  if (disable && (days !== undefined || date !== undefined)) {
    handleError({ message: 'Cannot use --disable with --days or --date' });
  }

  if (!enable && !disable && days === undefined && date === undefined) {
    handleError({ message: 'Provide --days, --date, --enable, or --disable' });
  }

  if (days !== undefined && (isNaN(Number(days)) || Number(days) <= 0)) {
    handleError({ message: '--days must be a positive number' });
  }

  if (date !== undefined) {
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}/.test(date) ||
      isNaN(new Date(date).getTime())
    ) {
      handleError({ message: '--date must be a valid ISO-8601 date (e.g. 2026-06-01)' });
    }
  }

  const config = await getStorageConfig();
  const selectedOrg = getSelectedOrganization();
  const finalConfig = {
    ...config,
    ...(selectedOrg && !config.organizationId
      ? { organizationId: selectedOrg }
      : {}),
  };

  const ttlConfig = {
    ...(enable ? { enabled: true } : {}),
    ...(disable ? { enabled: false } : {}),
    ...(days !== undefined ? { days: Number(days) } : {}),
    ...(date !== undefined ? { date } : {}),
  };

  const { error } = await setBucketTtl(name, {
    ttlConfig,
    config: finalConfig,
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({ name, action: 'ttl_updated' });
  }
  printSuccess(context, { name });
}
