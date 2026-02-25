import { listBucketSnapshots, createBucketSnapshot } from '@tigrisdata/storage';
import { fetchStorageConfig } from './storage-config.js';

export interface SnapshotInfo {
  name: string;
  version: string;
  created: Date;
}

export async function fetchSnapshots(bucket: string): Promise<SnapshotInfo[]> {
  const config = await fetchStorageConfig();

  const { data, error } = await listBucketSnapshots(bucket, { config });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((snapshot) => ({
    name: snapshot.name || '',
    version: snapshot.version || '',
    created: snapshot.creationDate ?? new Date(),
  }));
}

export async function takeSnapshot(
  bucket: string,
  snapshotName?: string
): Promise<string> {
  const config = await fetchStorageConfig();

  const { data, error } = await createBucketSnapshot(bucket, {
    name: snapshotName,
    config,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.snapshotVersion;
}
