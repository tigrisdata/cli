import { getOption } from '../../utils/options.js';
import { formatOutput } from '../../utils/format.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { listBuckets } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
  printEmpty,
  msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('buckets', 'list');

export default async function list(options: Record<string, unknown>) {
  printStart(context);

  try {
    const format = getOption<string>(options, ['format', 'F'], 'table');

    const { data, error } = await listBuckets({
      config: await getStorageConfig(),
    });

    if (error) {
      handleError(error);
    }

    if (!data.buckets || data.buckets.length === 0) {
      if (isJsonMode()) {
        jsonSuccess([]);
        return;
      }
      printEmpty(context);
      return;
    }

    const buckets = data.buckets.map((bucket) => ({
      name: bucket.name,
      created: bucket.creationDate,
    }));

    if (isJsonMode()) {
      jsonSuccess(buckets);
      return;
    }

    const output = formatOutput(buckets, format!, 'buckets', 'bucket', [
      { key: 'name', header: 'Name' },
      { key: 'created', header: 'Created' },
    ]);

    console.log(output);
    printSuccess(context, { count: buckets.length });
  } catch (error) {
    handleError(error instanceof Error ? error : { message: 'An unknown error occurred' });
  }
}
