import { getStorageConfig } from '../../auth/s3-client.js';
import { getOption } from '../../utils/options.js';
import {
  printStart,
  printSuccess,
    msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';
import { updateObject } from '@tigrisdata/storage';

const context = msg('objects', 'set');

export default async function setObject(options: Record<string, unknown>) {
  printStart(context);

  const bucket = getOption<string>(options, ['bucket']);
  const key = getOption<string>(options, ['key']);
  const access = getOption<string>(options, ['access', 'a', 'A']);
  const newKey = getOption<string>(options, ['new-key', 'n', 'newKey']);

  if (!bucket) {
    handleError({ message: 'Bucket name is required' });
  }

  if (!key) {
    handleError({ message: 'Object key is required' });
  }

  if (!access) {
    handleError({ message: 'Access level is required (--access public|private)' });
  }

  const config = await getStorageConfig();

  const { error } = await updateObject(key, {
    access: access === 'public' ? 'public' : 'private',
    ...(newKey && { key: newKey }),
    config: {
      ...config,
      bucket,
    },
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({ key, bucket, access, ...(newKey && { newKey }) });
    return;
  }
  printSuccess(context, { key, bucket });
}
