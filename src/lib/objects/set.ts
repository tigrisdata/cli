import { getStorageConfig } from '@auth/provider.js';
import { updateObject } from '@tigrisdata/storage';
import { exitWithError } from '@utils/exit.js';
import {
  msg,
  printFailure,
  printStart,
  printSuccess,
} from '@utils/messages.js';
import { getOption } from '@utils/options.js';

const context = msg('objects', 'set');

export default async function setObject(options: Record<string, unknown>) {
  printStart(context);

  const json = getOption<boolean>(options, ['json']);
  const format = json
    ? 'json'
    : getOption<string>(options, ['format', 'f', 'F'], 'table');

  const bucket = getOption<string>(options, ['bucket']);
  const key = getOption<string>(options, ['key']);
  const access = getOption<string>(options, ['access', 'a', 'A']);
  const newKey = getOption<string>(options, ['new-key', 'n', 'newKey']);

  if (!bucket) {
    printFailure(context, 'Bucket name is required');
    exitWithError('Bucket name is required', context);
  }

  if (!key) {
    printFailure(context, 'Object key is required');
    exitWithError('Object key is required', context);
  }

  if (!access) {
    printFailure(context, 'Access level is required (--access public|private)');
    exitWithError(
      'Access level is required (--access public|private)',
      context
    );
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
    printFailure(context, error.message);
    exitWithError(error, context);
  }

  if (format === 'json') {
    console.log(
      JSON.stringify({
        action: 'updated',
        bucket,
        key,
        access,
        ...(newKey ? { newKey } : {}),
      })
    );
  }

  printSuccess(context, { key, bucket });
}
