import {
  listBuckets,
  createBucket as sdkCreateBucket,
  removeBucket,
  getBucketInfo,
  updateBucket as sdkUpdateBucket,
  type StorageClass,
} from '@tigrisdata/storage';
import { fetchStorageConfig } from './storage-config.js';

export interface BucketInfo {
  name: string;
  created: Date;
}

export async function fetchBuckets(): Promise<BucketInfo[]> {
  const config = await fetchStorageConfig();
  const { data, error } = await listBuckets({ config });

  if (error) {
    throw new Error(error.message);
  }

  return (data.buckets || []).map((bucket) => ({
    name: bucket.name,
    created: bucket.creationDate,
  }));
}

export interface CreateBucketParams {
  name: string;
  access?: 'public' | 'private';
  defaultTier?: string;
  enableSnapshots?: boolean;
  region?: string;
}

export async function createBucket(params: CreateBucketParams): Promise<void> {
  const config = await fetchStorageConfig();

  const { error } = await sdkCreateBucket(params.name, {
    access: params.access ?? 'private',
    defaultTier: (params.defaultTier ?? 'STANDARD') as StorageClass,
    enableSnapshot: params.enableSnapshots === true,
    region:
      params.region && params.region !== 'global'
        ? params.region.split(',')
        : undefined,
    config,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteBucket(name: string): Promise<void> {
  const config = await fetchStorageConfig();
  const { error } = await removeBucket(name, { config });

  if (error) {
    throw new Error(error.message);
  }
}

export interface BucketDetail {
  numberOfObjects: string;
  totalSize: string;
  snapshotsEnabled: boolean;
  defaultTier: string;
  allowObjectAcl: boolean;
  hasForks: boolean;
  forkedFrom?: string;
  forkSnapshot?: string;
}

export async function fetchBucketDetail(bucket: string): Promise<BucketDetail> {
  const config = await fetchStorageConfig();
  const { data, error } = await getBucketInfo(bucket, { config });

  if (error) {
    throw new Error(error.message);
  }

  const { formatSize } = await import('../../utils/format.js');

  return {
    numberOfObjects: data.sizeInfo.numberOfObjects?.toString() ?? 'N/A',
    totalSize:
      data.sizeInfo.size !== undefined ? formatSize(data.sizeInfo.size) : 'N/A',
    snapshotsEnabled: data.isSnapshotEnabled,
    defaultTier: data.settings.defaultTier,
    allowObjectAcl: data.settings.allowObjectAcl,
    hasForks: data.forkInfo?.hasChildren ?? false,
    forkedFrom: data.forkInfo?.parents?.[0]?.bucketName,
    forkSnapshot: data.forkInfo?.parents?.[0]?.snapshot,
  };
}

export interface UpdateBucketParams {
  name: string;
  access?: 'public' | 'private';
  allowObjectAcl?: boolean;
}

export async function updateBucketSettings(
  params: UpdateBucketParams
): Promise<void> {
  const config = await fetchStorageConfig();
  const { error } = await sdkUpdateBucket(params.name, {
    access: params.access,
    allowObjectAcl: params.allowObjectAcl,
    config,
  });

  if (error) {
    throw new Error(error.message);
  }
}
