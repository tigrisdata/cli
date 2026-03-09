import { getOption } from '../../utils/options.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { createBucket } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
    msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('forks', 'create');

export default async function create(options: Record<string, unknown>) {
  printStart(context);

  const name = getOption<string>(options, ['name']);
  const forkName = getOption<string>(options, ['fork-name', 'forkName']);
  const snapshot = getOption<string>(options, ['snapshot', 's', 'S']);

  if (!name) {
    handleError({ message: 'Source bucket name is required' });
  }

  if (!forkName) {
    handleError({ message: 'Fork name is required' });
  }

  const { error } = await createBucket(forkName, {
    sourceBucketName: name,
    sourceBucketSnapshot: snapshot,
    config: await getStorageConfig(),
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({ source: name, fork: forkName, ...(snapshot && { snapshot }) });
    return;
  }
  printSuccess(context, { name, forkName });
}
