import { createBucket } from '@tigrisdata/storage';
import { fetchStorageConfig } from './storage-config.js';

export interface CreateForkParams {
  forkName: string;
  sourceBucket: string;
  sourceSnapshot: string;
}

export async function createFork(params: CreateForkParams): Promise<void> {
  const config = await fetchStorageConfig();

  const { error } = await createBucket(params.forkName, {
    sourceBucketName: params.sourceBucket,
    sourceBucketSnapshot: params.sourceSnapshot,
    config,
  });

  if (error) {
    throw new Error(error.message);
  }
}
