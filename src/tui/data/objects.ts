import { list, remove, head } from '@tigrisdata/storage';
import { fetchStorageConfig } from './storage-config.js';
import { formatSize } from '../../utils/format.js';

export interface ObjectInfo {
  key: string;
  size: string;
  modified: Date;
  isFolder: boolean;
}

export async function fetchObjects(
  bucket: string,
  prefix?: string
): Promise<ObjectInfo[]> {
  const config = await fetchStorageConfig();
  const normalizedPrefix = prefix
    ? prefix.endsWith('/')
      ? prefix
      : `${prefix}/`
    : undefined;

  const { data, error } = await list({
    prefix: normalizedPrefix,
    config: { ...config, bucket },
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data.items || [])
    .map((item) => {
      const name = normalizedPrefix
        ? item.name.slice(normalizedPrefix.length)
        : item.name;
      const firstSlash = name.indexOf('/');
      const displayName =
        firstSlash === -1 ? name : name.slice(0, firstSlash + 1);
      const isFolder = displayName.endsWith('/');

      return {
        key: displayName,
        size: isFolder ? '-' : formatSize(item.size),
        modified: item.lastModified,
        isFolder,
      };
    })
    .filter(
      (item, index, arr) =>
        item.key !== '' && arr.findIndex((i) => i.key === item.key) === index
    );
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  const config = await fetchStorageConfig();
  const { error } = await remove(key, {
    config: { ...config, bucket },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export interface ObjectMeta {
  path: string;
  size: string;
  contentType: string;
  contentDisposition: string;
  modified: string;
}

export async function fetchObjectMeta(
  bucket: string,
  objectPath: string
): Promise<ObjectMeta> {
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

  return {
    path: data.path,
    size: formatSize(data.size),
    contentType: data.contentType || 'N/A',
    contentDisposition: data.contentDisposition || 'N/A',
    modified: data.modified.toISOString(),
  };
}
