import { getOption } from '../../utils/options.js';
import { formatOutput } from '../../utils/format.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { listBuckets, getBucketInfo } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
    printEmpty,
  msg,
} from '../../utils/messages.js';
import { handleError } from '../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';

const context = msg('forks', 'list');

export default async function list(options: Record<string, unknown>) {
  printStart(context);

  const name = getOption<string>(options, ['name']);
  const format = getOption<string>(options, ['format', 'f', 'F'], 'table');

  if (!name) {
    handleError({ message: 'Source bucket name is required' });
  }

  const config = await getStorageConfig();

  // First, check if the bucket has forks
  const { data: bucketInfo, error: infoError } = await getBucketInfo(name, {
    config,
  });

  if (infoError) {
    handleError(infoError);
  }

  if (!bucketInfo.hasForks) {
    printEmpty(context);
    return;
  }

  // List all buckets and filter for forks of the source bucket
  const { data, error } = await listBuckets({ config });

  if (error) {
    handleError(error);
  }

  // Get info for each bucket to find forks
  const forks: Array<{ name: string; created: Date }> = [];

  for (const bucket of data.buckets) {
    if (bucket.name === name) continue;

    const { data: info } = await getBucketInfo(bucket.name, { config });
    if (info?.sourceBucketName === name) {
      forks.push({
        name: bucket.name,
        created: bucket.creationDate,
      });
    }
  }

  if (forks.length === 0) {
    if (isJsonMode()) {
      jsonSuccess({ source: name, forks: [] });
      return;
    }
    printEmpty(context);
    return;
  }

  if (isJsonMode()) {
    jsonSuccess({ source: name, forks });
    return;
  }

  const output = formatOutput(forks, format!, 'forks', 'fork', [
    { key: 'name', header: 'Name' },
    { key: 'created', header: 'Created' },
  ]);

  console.log(output);
  printSuccess(context, { count: forks.length });
}
