import { getStats, getBucketInfo, head } from '@tigrisdata/storage';
import { fetchStorageConfig } from './storage-config.js';
import { formatSize } from '../../utils/format.js';

export interface StatEntry {
  metric: string;
  value: string;
}

export async function fetchOverallStats(): Promise<StatEntry[]> {
  const config = await fetchStorageConfig();
  const { data, error } = await getStats({ config });

  if (error) {
    throw new Error(error.message);
  }

  return [
    { metric: 'Active Buckets', value: String(data.stats.activeBuckets) },
    { metric: 'Total Objects', value: String(data.stats.totalObjects) },
    {
      metric: 'Total Unique Objects',
      value: String(data.stats.totalUniqueObjects),
    },
    {
      metric: 'Total Storage',
      value: formatSize(data.stats.totalStorageBytes),
    },
  ];
}

export async function fetchBucketStat(bucket: string): Promise<StatEntry[]> {
  const config = await fetchStorageConfig();
  const { data, error } = await getBucketInfo(bucket, { config });

  if (error) {
    throw new Error(error.message);
  }

  const info: StatEntry[] = [
    {
      metric: 'Number of Objects',
      value: data.sizeInfo.numberOfObjects?.toString() ?? 'N/A',
    },
    {
      metric: 'Total Size',
      value:
        data.sizeInfo.size !== undefined
          ? formatSize(data.sizeInfo.size)
          : 'N/A',
    },
    {
      metric: 'All Versions Count',
      value: data.sizeInfo.numberOfObjectsAllVersions?.toString() ?? 'N/A',
    },
    {
      metric: 'Snapshots Enabled',
      value: data.isSnapshotEnabled ? 'Yes' : 'No',
    },
    { metric: 'Default Tier', value: data.settings.defaultTier },
    {
      metric: 'Allow Object ACL',
      value: data.settings.allowObjectAcl ? 'Yes' : 'No',
    },
    {
      metric: 'Has Forks',
      value: data.forkInfo?.hasChildren ? 'Yes' : 'No',
    },
  ];

  if (data.forkInfo?.parents?.length) {
    info.push({
      metric: 'Forked From',
      value: data.forkInfo.parents[0].bucketName,
    });
    info.push({
      metric: 'Fork Snapshot',
      value: data.forkInfo.parents[0].snapshot,
    });
  }

  return info;
}

export async function fetchObjectStat(
  bucket: string,
  objectPath: string
): Promise<StatEntry[]> {
  const config = await fetchStorageConfig();
  const { data, error } = await head(objectPath, {
    config: { ...config, bucket },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Object not found');
  }

  return [
    { metric: 'Path', value: data.path },
    { metric: 'Size', value: formatSize(data.size) },
    { metric: 'Content-Type', value: data.contentType || 'N/A' },
    {
      metric: 'Content-Disposition',
      value: data.contentDisposition || 'N/A',
    },
    { metric: 'Modified', value: data.modified.toISOString() },
  ];
}
