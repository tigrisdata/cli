import { getOption } from '../../utils/options.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { remove } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
    msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('objects', 'delete');

export default async function deleteObject(options: Record<string, unknown>) {
  printStart(context);

  const bucket = getOption<string>(options, ['bucket']);
  const keys = getOption<string | string[]>(options, ['key']);
  const dryRun = !!getOption<boolean>(options, ['dryRun', 'dry-run']);

  if (!bucket) {
    handleError({ message: 'Bucket name is required' });
  }

  if (!keys) {
    handleError({ message: 'Object key is required' });
  }

  const keyList = Array.isArray(keys) ? keys : [keys];

  if (dryRun) {
    if (isJsonMode()) {
      jsonSuccess({ bucket, keys: keyList, action: 'would_delete', dryRun: true });
    } else {
      for (const key of keyList) {
        console.log(`[dry-run] Would delete '${key}' from bucket '${bucket}'`);
      }
    }
    return;
  }

  const config = await getStorageConfig();

  const deleted: string[] = [];
  for (const key of keyList) {
    const { error } = await remove(key, {
      config: {
        ...config,
        bucket,
      },
    });

    if (error) {
      handleError(error);
    }

    deleted.push(key);
    printSuccess(context, { key });
  }

  if (isJsonMode()) {
    jsonSuccess({ bucket, deleted });
  }
}
