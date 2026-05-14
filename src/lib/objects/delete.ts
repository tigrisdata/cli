import { getStorageConfig } from '@auth/provider.js';
import { listVersions, remove } from '@tigrisdata/storage';
import {
  exitWithError,
  failWithError,
  getSuccessNextActions,
  printNextActions,
} from '@utils/exit.js';
import { confirm, requireInteractive } from '@utils/interactive.js';
import {
  msg,
  printFailure,
  printStart,
  printSuccess,
} from '@utils/messages.js';
import { getFormat, getOption } from '@utils/options.js';
import { resolveObjectArgs } from '@utils/path.js';

const context = msg('objects', 'delete');

type Target = { key: string; versionId?: string };

export default async function deleteObject(options: Record<string, unknown>) {
  printStart(context);

  const format = getFormat(options);

  const bucketArg = getOption<string>(options, ['bucket']);
  const keysArg = getOption<string | string[]>(options, ['key']);
  const force = getOption<boolean>(options, ['yes', 'y', 'force']);
  const versionId = getOption<string>(options, ['version-id', 'versionId']);
  const allVersions = !!getOption<boolean>(options, [
    'all-versions',
    'allVersions',
  ]);

  if (!bucketArg) {
    failWithError(context, 'Bucket name or path is required');
  }

  if (versionId && allVersions) {
    failWithError(context, 'Cannot use --version-id with --all-versions');
  }

  const resolved = resolveObjectArgs(bucketArg);
  const bucket = resolved.bucket;
  const keys = keysArg || resolved.key || undefined;

  if (!keys) {
    failWithError(context, 'Object key is required');
  }

  const config = await getStorageConfig();
  const bucketConfig = { ...config, bucket };
  const keyList = Array.isArray(keys) ? keys : [keys];

  if (versionId && keyList.length > 1) {
    failWithError(
      context,
      '--version-id targets a single object; pass exactly one key'
    );
  }

  // Resolve the list of (key, versionId?) targets to delete. By
  // default we issue an unversioned DELETE per key (server creates a
  // delete marker on versioned buckets). --version-id hard-deletes
  // one specific version. --all-versions enumerates every version
  // and every delete marker for each key and hard-deletes them all.
  const targets: Target[] = [];
  if (allVersions) {
    for (const key of keyList) {
      const { data, error } = await listVersions({
        prefix: key,
        config: bucketConfig,
      });
      if (error) {
        failWithError(context, error);
      }
      const matchingVersions = data.versions.filter((v) => v.name === key);
      const matchingMarkers = data.deleteMarkers.filter((m) => m.name === key);
      for (const v of matchingVersions) {
        targets.push({ key, versionId: v.versionId });
      }
      for (const m of matchingMarkers) {
        targets.push({ key, versionId: m.versionId });
      }
      if (matchingVersions.length === 0 && matchingMarkers.length === 0) {
        failWithError(
          context,
          `No versions or delete markers found for key '${key}'`
        );
      }
    }
  } else if (versionId) {
    targets.push({ key: keyList[0], versionId });
  } else {
    for (const key of keyList) targets.push({ key });
  }

  if (!force) {
    requireInteractive('Use --yes to skip confirmation');
    const label = allVersions
      ? `Hard-delete ${targets.length} version(s) and delete marker(s) for ${keyList.length} object(s) from '${bucket}'?`
      : versionId
        ? `Hard-delete version '${versionId}' of '${keyList[0]}' from '${bucket}'?`
        : `Delete ${keyList.length} object(s) from '${bucket}'?`;
    const confirmed = await confirm(label);
    if (!confirmed) {
      console.log('Aborted');
      return;
    }
  }

  const deleted: Target[] = [];
  const errors: { key: string; versionId?: string; error: string }[] = [];
  for (const target of targets) {
    const { error } = await remove(target.key, {
      ...(target.versionId ? { versionId: target.versionId } : {}),
      config: bucketConfig,
    });

    if (error) {
      printFailure(context, error.message, target);
      errors.push({ ...target, error: error.message });
    } else {
      deleted.push(target);
      printSuccess(context, target);
    }
  }

  if (format === 'json') {
    const nextActions = getSuccessNextActions(context, { bucket });
    const jsonOutput: Record<string, unknown> = {
      action: 'deleted',
      bucket,
      deleted,
      errors,
    };
    if (nextActions.length > 0) jsonOutput.nextActions = nextActions;
    console.log(JSON.stringify(jsonOutput));
  }

  if (errors.length > 0) {
    exitWithError(errors[0].error, context);
  }

  printNextActions(context, { bucket });
}
