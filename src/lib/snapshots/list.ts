import { getOption } from '../../utils/options.js';
import { formatOutput } from '../../utils/format.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { listBucketSnapshots } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
    printEmpty,
  msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('snapshots', 'list');

export default async function list(options: Record<string, unknown>) {
  printStart(context);

  const name = getOption<string>(options, ['name']);
  const format = getOption<string>(options, ['format', 'f', 'F'], 'table');

  if (!name) {
    handleError({ message: 'Bucket name is required' });
  }

  const config = await getStorageConfig();

  const { data, error } = await listBucketSnapshots(name, { config });

  if (error) {
    handleError(error);
  }

  if (!data || data.length === 0) {
    if (isJsonMode()) {
      jsonSuccess({ bucket: name, snapshots: [] });
      return;
    }
    printEmpty(context);
    return;
  }

  const snapshots = data.map((snapshot) => ({
    name: snapshot.name || '',
    version: snapshot.version || '',
    created: snapshot.creationDate,
  }));

  if (isJsonMode()) {
    jsonSuccess({ bucket: name, snapshots });
    return;
  }

  const output = formatOutput(snapshots, format!, 'snapshots', 'snapshot', [
    { key: 'name', header: 'Name' },
    { key: 'version', header: 'Version' },
    { key: 'created', header: 'Created' },
  ]);

  console.log(output);
  printSuccess(context, { count: snapshots.length });
}
