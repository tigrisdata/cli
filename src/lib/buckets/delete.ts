import { getOption } from '../../utils/options.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { removeBucket } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
  msg,
} from '../../utils/messages.js';
import { confirm } from '../../utils/confirm.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('buckets', 'delete');

export default async function deleteBucket(options: Record<string, unknown>) {
  printStart(context);

  const names = getOption<string | string[]>(options, ['name']);
  const yes = getOption<boolean>(options, ['yes', 'y']);
  const force = getOption<boolean>(options, ['force', 'f']) || yes;
  const dryRun = !!getOption<boolean>(options, ['dryRun', 'dry-run']);

  if (!names) {
    handleError({ message: 'Bucket name is required' });
  }

  const bucketNames = Array.isArray(names) ? names : [names];
  const config = await getStorageConfig();

  if (!force) {
    const label =
      bucketNames.length === 1
        ? `bucket '${bucketNames[0]}'`
        : `${bucketNames.length} buckets`;
    const confirmed = await confirm(
      `Are you sure you want to delete ${label}?`
    );
    if (!confirmed) {
      console.log('Aborted');
      return;
    }
  }

  if (dryRun) {
    if (isJsonMode()) {
      jsonSuccess({ buckets: bucketNames, action: 'would_delete', dryRun: true });
    } else {
      for (const name of bucketNames) {
        console.log(`[dry-run] Would delete bucket '${name}'`);
      }
    }
    return;
  }

  for (const name of bucketNames) {
    const { error } = await removeBucket(name, { config });

    if (error) {
      handleError(error);
    }

    if (isJsonMode()) {
      jsonSuccess({ name, action: 'deleted' });
    }
    printSuccess(context, { name });
  }
}
