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
import { formatSize } from '../utils/format.js';
import { get, put, remove, list, head } from '@tigrisdata/storage';
import { calculateUploadParams } from '../utils/upload.js';
import { confirm } from '../utils/confirm.js';
import { isJsonMode, output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export default async function mv(options: Record<string, unknown>) {
  const src = getOption<string>(options, ['src']);
  const dest = getOption<string>(options, ['dest']);
  const yes = getOption<boolean>(options, ['yes', 'y']);
  const force = getOption<boolean>(options, ['force', 'f', 'F']) || yes;
  const recursive = !!getOption<boolean>(options, ['recursive', 'r']);
  const dryRun = !!getOption<boolean>(options, ['dryRun', 'dry-run']);

  if (!src || !dest) {
    handleError({ message: 'both src and dest arguments are required' });
  }

  if (!isRemotePath(src) || !isRemotePath(dest)) {
    handleError({ message: 'Both src and dest must be remote Tigris paths (t3:// or tigris://)' });
  }

  const srcPath = parseRemotePath(src);
  const destPath = parseRemotePath(dest);

  if (!srcPath.bucket) {
    handleError({ message: 'Invalid source path' });
  }

  if (!destPath.bucket) {
    handleError({ message: 'Invalid destination path' });
  }

  // Cannot move a bucket itself
  // t3://bucket (no path, no trailing slash) = error
  // t3://bucket/ (no path, trailing slash) = move all contents from bucket root
  const rawEndsWithSlash = src.endsWith('/');
  if (!srcPath.path && !rawEndsWithSlash) {
    handleError({ message: 'Cannot move a bucket. Provide a path within the bucket.' });
  }

  const config = await getStorageConfig({ withCredentialProvider: true });

  // Check if source is a single object or a prefix (folder/wildcard)
  const isWildcard = srcPath.path.includes('*');
  let isFolder =
    srcPath.path.endsWith('/') || (!srcPath.path && rawEndsWithSlash);

  // If not explicitly a folder, check if it's a prefix with objects
  if (!isWildcard && !isFolder && srcPath.path) {
    isFolder = await isPathFolder(srcPath.bucket, srcPath.path, config);
  }

  if (isFolder && !isWildcard && !recursive) {
    handleError({ message: 'Source is a remote folder (not moved). Use -r to move recursively.' });
  }

  if (isWildcard || isFolder) {
    // List and move multiple objects
    const prefix = isWildcard
      ? wildcardPrefix(srcPath.path)
      : srcPath.path
        ? srcPath.path.endsWith('/')
          ? srcPath.path
          : `${srcPath.path}/`
        : '';

    // Linux cp convention: trailing slash = contents only, no slash = include folder name
    const folderName =
      !isWildcard && srcPath.path && !srcPath.path.endsWith('/')
        ? (srcPath.path.split('/').filter(Boolean).pop() ?? '')
        : '';

    const destBase = destPath.path?.replace(/\/$/, '') || '';
    const effectiveDestPrefix = [destBase, folderName]
      .filter(Boolean)
      .join('/');
    const effectiveDestPrefixWithSlash = effectiveDestPrefix
      ? `${effectiveDestPrefix}/`
      : '';

    if (
      srcPath.bucket === destPath.bucket &&
      prefix === effectiveDestPrefixWithSlash
    ) {
      handleError({ message: 'Source and destination are the same' });
    }

    const { items, error } = await listAllItems(
      srcPath.bucket,
      prefix || undefined,
      config
    );

    if (error) {
      handleError(error);
    }

    // Filter out folder markers - they're handled separately below
    let itemsToMove = items.filter((item) => item.name !== prefix);

    if (isWildcard) {
      const filePattern = srcPath.path.split('/').pop()!;
      const regex = globToRegex(filePattern);
      itemsToMove = itemsToMove.filter((item) => {
        const rel = prefix ? item.name.slice(prefix.length) : item.name;
        if (!recursive && rel.includes('/')) return false;
        return regex.test(rel.split('/').pop()!);
      });
    }

    // Check if folder marker exists
    const { data: markerData } = await list({
      prefix,
      limit: 1,
      config: {
        ...config,
        bucket: srcPath.bucket,
      },
    });
    const hasFolderMarker = prefix
      ? markerData?.items?.some((item) => item.name === prefix)
      : false;

    if (itemsToMove.length === 0 && !hasFolderMarker) {
      console.log('No objects to move');
      return;
    }

    const totalToMove = itemsToMove.length + (hasFolderMarker ? 1 : 0);

    if (dryRun) {
      const wouldMove = itemsToMove.map((item) => {
        const relativePath = prefix ? item.name.slice(prefix.length) : item.name;
        const destKey = effectiveDestPrefix ? `${effectiveDestPrefix}/${relativePath}` : relativePath;
        return { src: `t3://${srcPath.bucket}/${item.name}`, dest: `t3://${destPath.bucket}/${destKey}` };
      });
      output(`[dry-run] Would move ${totalToMove} object(s)`, { moves: wouldMove, count: totalToMove, action: 'would_move', dryRun: true });
      return;
    }

    if (!force) {
      const confirmed = await confirm(
        `Are you sure you want to move ${totalToMove} object(s)?`
      );
      if (!confirmed) {
        console.log('Aborted');
        return;
      }
    }

    let moved = 0;
    for (const item of itemsToMove) {
      const relativePath = prefix ? item.name.slice(prefix.length) : item.name;
      const destKey = effectiveDestPrefix
        ? `${effectiveDestPrefix}/${relativePath}`
        : relativePath;

      const moveResult = await moveObject(
        config,
        srcPath.bucket,
        item.name,
        destPath.bucket,
        destKey
      );

      if (moveResult.error) {
        if (!isJsonMode()) {
          console.error(`Failed to move ${item.name}: ${moveResult.error}`);
        }
      } else {
        if (!isJsonMode()) {
          console.log(
            `Moved t3://${srcPath.bucket}/${item.name} -> t3://${destPath.bucket}/${destKey}`
          );
        }
        moved++;
      }
    }

    // Also move the folder marker if it exists (already checked above)
    let movedMarker = false;
    if (hasFolderMarker) {
      if (effectiveDestPrefix) {
        // Move folder marker to destination folder
        const destFolderMarker = `${effectiveDestPrefix}/`;
        const markerResult = await moveObject(
          config,
          srcPath.bucket,
          prefix,
          destPath.bucket,
          destFolderMarker
        );
        if (markerResult.error) {
          console.error(`Failed to move folder marker: ${markerResult.error}`);
        } else {
          movedMarker = true;
        }
      } else {
        // Moving to root - just delete source folder marker, no marker at root
        const { error: removeError } = await remove(prefix, {
          config: {
            ...config,
            bucket: srcPath.bucket,
          },
        });
        if (removeError) {
          console.error(
            `Failed to remove source folder marker: ${removeError.message}`
          );
        } else {
          movedMarker = true;
        }
      }
    }

    // Only count folder marker if no regular files were moved (empty folder case)
    if (moved === 0 && movedMarker) {
      moved = 1;
    }

    output(`Moved ${moved} object(s)`, { moved, action: 'moved' });
  } else {
    // Move single object
    const srcFileName = srcPath.path.split('/').pop()!;
    let destKey: string;

    if (!destPath.path) {
      // No dest path, use source filename
      destKey = srcFileName;
    } else if (destPath.path.endsWith('/')) {
      // Explicit folder destination
      destKey = `${destPath.path}${srcFileName}`;
    } else {
      // Check if destination is an existing folder
      const destIsFolder = await isPathFolder(
        destPath.bucket,
        destPath.path,
        config
      );
      if (destIsFolder) {
        destKey = `${destPath.path}/${srcFileName}`;
      } else {
        destKey = destPath.path;
      }
    }

    // Check for same location
    if (srcPath.bucket === destPath.bucket && srcPath.path === destKey) {
      handleError({ message: 'Source and destination are the same' });
    }

    if (dryRun) {
      output(`[dry-run] Would move 't3://${srcPath.bucket}/${srcPath.path}' -> 't3://${destPath.bucket}/${destKey}'`, {
        src: `t3://${srcPath.bucket}/${srcPath.path}`,
        dest: `t3://${destPath.bucket}/${destKey}`,
        action: 'would_move',
        dryRun: true,
      });
      return;
    }

    if (!force) {
      const confirmed = await confirm(
        `Are you sure you want to move 't3://${srcPath.bucket}/${srcPath.path}'?`
      );
      if (!confirmed) {
        console.log('Aborted');
        return;
      }
    }

    const result = await moveObject(
      config,
      srcPath.bucket,
      srcPath.path,
      destPath.bucket,
      destKey,
      true // show progress for single file
    );

    if (result.error) {
      handleError({ message: result.error });
    }

    output(
      `Moved t3://${srcPath.bucket}/${srcPath.path} -> t3://${destPath.bucket}/${destKey}`,
      { src: `t3://${srcPath.bucket}/${srcPath.path}`, dest: `t3://${destPath.bucket}/${destKey}`, action: 'moved' }
    );
  }
}

async function moveObject(
  config: Awaited<ReturnType<typeof getStorageConfig>>,
  srcBucket: string,
  srcKey: string,
  destBucket: string,
  destKey: string,
  showProgress = false
): Promise<{ error?: string }> {
  // Handle folder markers specially (empty objects ending with /)
  if (srcKey.endsWith('/')) {
    // Put empty string to destination (creates folder marker)
    const { error: putError } = await put(destKey, '', {
      config: {
        ...config,
        bucket: destBucket,
      },
    });

    if (putError) {
      return { error: putError.message };
    }

    // Delete source folder marker
    const { error: removeError } = await remove(srcKey, {
      config: {
        ...config,
        bucket: srcBucket,
      },
    });

    if (removeError) {
      return {
        error: `Copied but failed to delete source: ${removeError.message}`,
      };
    }

    return {};
  }

  // Get source object size for upload params and progress
  const { data: headData } = await head(srcKey, {
    config: {
      ...config,
      bucket: srcBucket,
    },
  });
  const fileSize = headData?.size;

  // Get source object
  const { data, error: getError } = await get(srcKey, 'stream', {
    config: {
      ...config,
      bucket: srcBucket,
    },
  });

  if (getError) {
    return { error: getError.message };
  }

  // Put to destination
  const { error: putError } = await put(destKey, data, {
    ...calculateUploadParams(fileSize),
    onUploadProgress: showProgress
      ? ({ loaded }) => {
          if (fileSize !== undefined && fileSize > 0) {
            const pct = Math.round((loaded / fileSize) * 100);
            process.stdout.write(
              `\rMoving: ${formatSize(loaded)} / ${formatSize(fileSize)} (${pct}%)`
            );
          } else {
            process.stdout.write(`\rMoving: ${formatSize(loaded)}`);
          }
        }
      : undefined,
    config: {
      ...config,
      bucket: destBucket,
    },
  });

  if (showProgress) {
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
  }

  if (putError) {
    return { error: putError.message };
  }

  // Delete source
  const { error: removeError } = await remove(srcKey, {
    config: {
      ...config,
      bucket: srcBucket,
    },
  });

  if (removeError) {
    return {
      error: `Copied but failed to delete source: ${removeError.message}`,
    };
  }

  return {};
}
