import { getOption } from '../../utils/options.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { createBucketSnapshot } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
    msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('snapshots', 'take');

export default async function take(options: Record<string, unknown>) {
  printStart(context);

  const name = getOption<string>(options, ['name']);
  const snapshotName = getOption<string>(options, [
    'snapshot-name',
    'snapshotName',
  ]);

  if (!name) {
    handleError({ message: 'Bucket name is required' });
  }

  const config = await getStorageConfig();

  const { data, error } = await createBucketSnapshot(name, {
    name: snapshotName,
    config,
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({
      bucket: name,
      snapshotName: snapshotName || data?.snapshotVersion,
      version: data?.snapshotVersion,
    });
    return;
  }
  printSuccess(context, {
    name,
    snapshotName: snapshotName || data?.snapshotVersion,
    version: data?.snapshotVersion,
  });
}
