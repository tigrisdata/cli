import { getOption } from '../../utils/options.js';
import { formatOutput, formatSize } from '../../utils/format.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { list } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
    printEmpty,
  msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('objects', 'list');

export default async function listObjects(options: Record<string, unknown>) {
  printStart(context);

  const bucket = getOption<string>(options, ['bucket']);
  const prefix = getOption<string>(options, ['prefix', 'p', 'P']);
  const format = getOption<string>(options, ['format', 'f', 'F'], 'table');

  if (!bucket) {
    handleError({ message: 'Bucket name is required' });
  }

  const config = await getStorageConfig();

  const { data, error } = await list({
    prefix: prefix || undefined,
    config: {
      ...config,
      bucket,
    },
  });

  if (error) {
    handleError(error);
  }

  if (!data.items || data.items.length === 0) {
    if (isJsonMode()) {
      jsonSuccess({ bucket, objects: [] });
      return;
    }
    printEmpty(context);
    return;
  }

  const objects = data.items.map((item) => ({
    key: item.name,
    size: formatSize(item.size),
    modified: item.lastModified,
  }));

  if (isJsonMode()) {
    jsonSuccess({ bucket, objects });
    return;
  }

  const output = formatOutput(objects, format!, 'objects', 'object', [
    { key: 'key', header: 'Key' },
    { key: 'size', header: 'Size' },
    { key: 'modified', header: 'Modified' },
  ]);

  console.log(output);
  printSuccess(context, { count: objects.length });
}
