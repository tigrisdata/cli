import { parseAnyPath } from '../utils/path.js';
import { getOption } from '../utils/options.js';
import { getStorageConfig } from '../auth/s3-client.js';
import { createBucket, put, type StorageClass } from '@tigrisdata/storage';
import { parseLocations } from '../utils/locations.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export default async function mk(options: Record<string, unknown>) {
  const pathString = getOption<string>(options, ['path']);

  if (!pathString) {
    handleError({ message: 'path argument is required' });
  }

  const { bucket, path } = parseAnyPath(pathString);

  if (!bucket) {
    handleError({ message: 'Invalid path' });
  }

  const config = await getStorageConfig();

  if (!path) {
    // Create a bucket
    const isPublic = getOption<boolean>(options, ['public']);
    const access = isPublic
      ? 'public'
      : getOption<string>(options, ['access', 'a', 'A']);
    const enableSnapshots = getOption<boolean>(options, [
      'enableSnapshots',
      'enable-snapshots',
      's',
      'S',
    ]);
    const defaultTier = getOption<string>(options, [
      'defaultTier',
      'default-tier',
      't',
      'T',
    ]);
    let locations = getOption<string>(options, ['locations', 'l', 'L']);

    // Handle deprecated --region and --consistency options
    const deprecatedRegion = getOption<string>(options, ['region', 'r', 'R']);
    const deprecatedConsistency = getOption<string>(options, [
      'consistency',
      'c',
      'C',
    ]);
    if (deprecatedRegion !== undefined) {
      console.warn(
        'Warning: --region is deprecated, use --locations instead. See https://www.tigrisdata.com/docs/buckets/locations/'
      );
      if (locations === undefined) {
        locations = deprecatedRegion;
      }
    }
    if (deprecatedConsistency !== undefined) {
      console.warn(
        'Warning: --consistency is deprecated, use --locations instead. See https://www.tigrisdata.com/docs/buckets/locations/'
      );
    }

    const { error } = await createBucket(bucket, {
      defaultTier: (defaultTier ?? 'STANDARD') as StorageClass,
      enableSnapshot: enableSnapshots === true,
      access: (access ?? 'private') as 'public' | 'private',
      locations: parseLocations(locations ?? 'global'),
      config,
    });

    if (error) {
      handleError(error);
    }

    output(`Bucket '${bucket}' created`, { name: bucket, action: 'created', type: 'bucket' });
    return;
  } else {
    // Create a "folder" (empty object with trailing slash)
    const folderPath = path.endsWith('/') ? path : `${path}/`;

    const { error } = await put(folderPath, '', {
      config: {
        ...config,
        bucket,
      },
    });

    if (error) {
      handleError(error);
    }

    output(`Folder '${bucket}/${folderPath}' created`, { bucket, path: folderPath, action: 'created', type: 'folder' });
  }
}
