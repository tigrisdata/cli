import { getOption } from '../../utils/options.js';
import { getStorageConfig } from '../../auth/s3-client.js';
import { getSelectedOrganization } from '../../auth/storage.js';
import { listBuckets, getBucketInfo } from '@tigrisdata/storage';
import {
  printStart,
  printSuccess,
  printFailure,
  msg,
} from '../../utils/messages.js';
import { isJsonMode, jsonSuccess } from '../../utils/output.js';
import { handleError } from '../../utils/errors.js';

const context = msg('credentials', 'test');

export default async function test(options: Record<string, unknown>) {
  printStart(context);

  const bucket = getOption<string>(options, ['bucket', 'b']);

  const config = await getStorageConfig();

  if (!config.accessKeyId && !config.sessionToken) {
    handleError({ message: 'No credentials found. Run "tigris configure" or "tigris login" first.' });
  }

  // Include organization ID if available
  const selectedOrg = getSelectedOrganization();
  const finalConfig = {
    ...config,
    ...(selectedOrg && !config.organizationId
      ? { organizationId: selectedOrg }
      : {}),
  };

  if (bucket) {
    // Test access to specific bucket
    const { data, error } = await getBucketInfo(bucket, {
      config: finalConfig,
    });

    if (error) {
      handleError({ message: `Current credentials don't have access to bucket "${bucket}"` });
    }

    if (isJsonMode()) {
      jsonSuccess({ valid: true, bucket, forkOf: data.sourceBucketName || undefined });
    } else {
      console.log(`  Bucket: ${bucket}`);
      console.log(`  Access verified.`);
      if (data.sourceBucketName) {
        console.log(`  Fork of: ${data.sourceBucketName}`);
      }
      printSuccess(context);
    }
  } else {
    // Test general access by listing buckets
    const { data, error } = await listBuckets({ config: finalConfig });

    if (error) {
      handleError({ message: "Current credentials don't have sufficient access" });
    }

    if (isJsonMode()) {
      jsonSuccess({ valid: true, bucketCount: data.buckets.length });
    } else {
      console.log(`  Access verified. Found ${data.buckets.length} bucket(s).`);
      printSuccess(context);
    }
  }
}
