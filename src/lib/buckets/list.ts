import { getOption } from '../../utils/options.js';
import { formatOutput } from '../../utils/format.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { listBuckets } from '@tigrisdata/storage';

export default async function list(options: Record<string, unknown>) {
  console.log('🪣 Listing Buckets');

  try {
    const format = getOption<string>(options, ['format', 'F'], 'table');

    const { data, error } = await listBuckets({
      config: await getStorageConfig(),
    });

    if (error) {
      console.error('❌ Failed to list buckets:', error.message);
      process.exit(1);
    }

    if (!data.buckets || data.buckets.length === 0) {
      console.log('No buckets found');
      return;
    }

    const buckets = data.buckets.map((bucket) => ({
      name: bucket.name,
      created: bucket.creationDate,
    }));

    const output = formatOutput(buckets, format!, 'buckets', 'bucket', [
      { key: 'name', header: 'Name', width: 50 },
      { key: 'created', header: 'Created', width: 50 },
    ]);

    console.log(output);
    console.log(`Found ${buckets.length} bucket(s)`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Failed to list buckets: ${error.message}`);

      if (error.message.includes('Not authenticated')) {
        console.log(
          '💡 Run "tigris login" or "tigris configure" to authenticate\n'
        );
      } else if (error.message.includes('No organization selected')) {
        console.log('💡 Run "tigris orgs select" to choose an organization\n');
      }
    } else {
      console.error('\n❌ An unknown error occurred');
    }
    process.exit(1);
  }
}
