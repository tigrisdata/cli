import {
  isRemotePath,
  parseRemotePath,
  isPathFolder,
  listAllItems,
  globToRegex,
  wildcardPrefix,
} from '../utils/path.js';
import { getOption } from '../utils/options.js';
import { getStorageConfig } from '../auth/s3-client.js';
import { remove, removeBucket, list } from '@tigrisdata/storage';
import { confirm } from '../utils/confirm.js';
import { isJsonMode, jsonSuccess, output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export default async function rm(options: Record<string, unknown>) {
  const pathString = getOption<string>(options, ['path']);
  const yes = getOption<boolean>(options, ['yes', 'y']);
  const force = getOption<boolean>(options, ['force', 'f', 'F']) || yes;
  const recursive = !!getOption<boolean>(options, ['recursive', 'r']);
  const dryRun = !!getOption<boolean>(options, ['dryRun', 'dry-run']);

  if (!pathString) {
    handleError({ message: 'path argument is required' });
  }

  if (!isRemotePath(pathString)) {
    handleError({ message: 'Path must be a remote Tigris path (t3:// or tigris://)' });
  }

  const { bucket, path } = parseRemotePath(pathString);

  if (!bucket) {
    handleError({ message: 'Invalid path' });
  }

  const config = await getStorageConfig();

  // If no path and no trailing slash, remove the bucket
  const rawEndsWithSlash = pathString.endsWith('/');
  if (!path && !rawEndsWithSlash) {
    if (!force) {
      const confirmed = await confirm(
        `Are you sure you want to delete bucket '${bucket}'?`,
        { yes: false }
      );
      if (!confirmed) {
        console.log('Aborted');
        return;
      }
    }

    if (dryRun) {
      output(`[dry-run] Would remove bucket '${bucket}'`, { bucket, action: 'would_remove', type: 'bucket', dryRun: true });
      return;
    }

    const { error } = await removeBucket(bucket, { config });

    if (error) {
      handleError(error);
    }

    output(`Removed bucket '${bucket}'`, { bucket, action: 'removed', type: 'bucket' });
    return;
  }

  // Check if it's a wildcard or folder
  const isWildcard = path.includes('*');
  let isFolder = path.endsWith('/') || (!path && rawEndsWithSlash);

  // If not explicitly a folder, check if it's a prefix with objects
  if (!isWildcard && !isFolder) {
    isFolder = await isPathFolder(bucket, path, config);
  }

  if (isFolder && !isWildcard && !recursive) {
    handleError({ message: 'Source is a remote folder (not removed). Use -r to remove recursively.' });
  }

  if (isWildcard || isFolder) {
    // List and remove multiple objects
    const prefix = isWildcard
      ? wildcardPrefix(path)
      : path
        ? path.endsWith('/')
          ? path
          : `${path}/`
        : '';

    const { items, error } = await listAllItems(
      bucket,
      prefix || undefined,
      config
    );

    if (error) {
      handleError(error);
    }

    let itemsToRemove = items;

    if (isWildcard) {
      const filePattern = path.split('/').pop()!;
      const regex = globToRegex(filePattern);
      itemsToRemove = itemsToRemove.filter((item) => {
        const rel = prefix ? item.name.slice(prefix.length) : item.name;
        if (!recursive && rel.includes('/')) return false;
        return regex.test(rel.split('/').pop()!);
      });
    }

    // Also check if the folder marker itself exists (e.g., "hello/")
    const folderMarker = prefix;
    const hasFolderMarkerInList = itemsToRemove.some(
      (item) => item.name === folderMarker
    );

    // If folder marker not in list, check if it exists separately
    let hasSeparateFolderMarker = false;
    if (!hasFolderMarkerInList && !isWildcard) {
      const { data: markerData } = await list({
        prefix: folderMarker,
        limit: 1,
        config: {
          ...config,
          bucket,
        },
      });
      hasSeparateFolderMarker =
        markerData?.items?.some((item) => item.name === folderMarker) || false;
    }

    const totalItems = itemsToRemove.length + (hasSeparateFolderMarker ? 1 : 0);

    if (totalItems === 0) {
      output('No objects to remove', { bucket, removed: 0, action: 'removed' });
      return;
    }

    if (dryRun) {
      const wouldRemove = itemsToRemove.map((item) => `t3://${bucket}/${item.name}`);
      if (hasSeparateFolderMarker) wouldRemove.push(`t3://${bucket}/${folderMarker}`);
      output(`[dry-run] Would remove ${totalItems} object(s)`, { bucket, items: wouldRemove, count: totalItems, action: 'would_remove', dryRun: true });
      return;
    }

    if (!force) {
      const confirmed = await confirm(
        `Are you sure you want to delete ${totalItems} object(s)?`
      );
      if (!confirmed) {
        console.log('Aborted');
        return;
      }
    }

    let removed = 0;
    const removedItems: string[] = [];

    // Remove all items (including folder marker if in list)
    for (const item of itemsToRemove) {
      const { error: removeError } = await remove(item.name, {
        config: {
          ...config,
          bucket,
        },
      });

      if (removeError) {
        if (!isJsonMode()) {
          console.error(`Failed to remove ${item.name}: ${removeError.message}`);
        }
      } else {
        if (!isJsonMode()) {
          console.log(`Removed t3://${bucket}/${item.name}`);
        }
        removedItems.push(`t3://${bucket}/${item.name}`);
        removed++;
      }
    }

    // Remove folder marker if it exists separately
    if (hasSeparateFolderMarker) {
      const { error: removeError } = await remove(folderMarker, {
        config: {
          ...config,
          bucket,
        },
      });

      if (removeError) {
        if (!isJsonMode()) {
          console.error(
            `Failed to remove ${folderMarker}: ${removeError.message}`
          );
        }
      } else {
        if (!isJsonMode()) {
          console.log(`Removed t3://${bucket}/${folderMarker}`);
        }
        removedItems.push(`t3://${bucket}/${folderMarker}`);
        removed++;
      }
    }

    output(`Removed ${removed} object(s)`, { bucket, removed, items: removedItems, action: 'removed' });
  } else {
    // Remove single object
    if (dryRun) {
      output(`[dry-run] Would remove 't3://${bucket}/${path}'`, { bucket, path, action: 'would_remove', type: 'object', dryRun: true });
      return;
    }

    if (!force) {
      const confirmed = await confirm(
        `Are you sure you want to delete 't3://${bucket}/${path}'?`
      );
      if (!confirmed) {
        console.log('Aborted');
        return;
      }
    }

    const { error } = await remove(path, {
      config: {
        ...config,
        bucket,
      },
    });

    if (error) {
      handleError(error);
    }

    output(`Removed t3://${bucket}/${path}`, { bucket, path, action: 'removed', type: 'object' });
  }
}
