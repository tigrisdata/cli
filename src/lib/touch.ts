import { parseAnyPath } from '../utils/path.js';
import { getOption } from '../utils/options.js';
import { getStorageConfig } from '../auth/s3-client.js';
import { put } from '@tigrisdata/storage';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export default async function touch(options: Record<string, unknown>) {
  const pathString = getOption<string>(options, ['path']);

  if (!pathString) {
    handleError({ message: 'path argument is required' });
  }

  const { bucket, path } = parseAnyPath(pathString);

  if (!bucket) {
    handleError({ message: 'Invalid path' });
  }

  if (!path) {
    handleError({ message: 'Object key is required (use mk to create buckets)' });
  }

  const config = await getStorageConfig();

  const { error } = await put(path, '', {
    config: {
      ...config,
      bucket,
    },
  });

  if (error) {
    handleError(error);
  }

  output(`Created '${bucket}/${path}'`, { bucket, path, action: 'created' });
}
