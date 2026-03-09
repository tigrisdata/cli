import { getOption } from '../../utils/options.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { getSelectedOrganization } from '../../auth/storage.js';
import { setBucketCors } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
  msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('buckets', 'set-cors');

export default async function setCors(options: Record<string, unknown>) {
  printStart(context);

  const name = getOption<string>(options, ['name']);
  const origins = getOption<string>(options, ['origins']);
  const methods = getOption<string>(options, ['methods']);
  const headers = getOption<string>(options, ['headers']);
  const exposeHeaders = getOption<string>(options, [
    'expose-headers',
    'exposeHeaders',
  ]);
  const maxAge = getOption<string>(options, ['max-age', 'maxAge']);
  const override = getOption<boolean>(options, ['override']);
  const reset = getOption<boolean>(options, ['reset']);

  if (!name) {
    handleError({ message: 'Bucket name is required' });
  }

  if (
    reset &&
    (origins !== undefined ||
      methods !== undefined ||
      headers !== undefined ||
      exposeHeaders !== undefined ||
      maxAge !== undefined ||
      override)
  ) {
    handleError({ message: 'Cannot use --reset with other options' });
  }

  if (!reset && !origins) {
    handleError({ message: 'Provide --origins or --reset' });
  }

  if (maxAge !== undefined && (isNaN(Number(maxAge)) || Number(maxAge) <= 0)) {
    handleError({ message: '--max-age must be a positive number' });
  }

  const config = await getStorageConfig();
  const selectedOrg = getSelectedOrganization();
  const finalConfig = {
    ...config,
    ...(selectedOrg && !config.organizationId
      ? { organizationId: selectedOrg }
      : {}),
  };

  const { error } = await setBucketCors(name, {
    rules: reset
      ? []
      : [
          {
            allowedOrigins: origins!,
            ...(methods !== undefined ? { allowedMethods: methods } : {}),
            ...(headers !== undefined ? { allowedHeaders: headers } : {}),
            ...(exposeHeaders !== undefined ? { exposeHeaders } : {}),
            maxAge: maxAge !== undefined ? Number(maxAge) : 3600,
          },
        ],
    override: override ?? false,
    config: finalConfig,
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({ name, action: 'cors_updated' });
  }
  printSuccess(context, { name });
}
