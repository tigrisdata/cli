import type {
  BucketInfoResponse,
  BucketLifecycleRule,
} from '@tigrisdata/storage';

import { formatSize } from './format.js';

function formatLifecycleRule(rule: BucketLifecycleRule): string {
  const parts: string[] = [];

  if (rule.storageClass) {
    if (rule.days !== undefined) {
      parts.push(`${rule.storageClass} after ${rule.days}d`);
    } else if (rule.date !== undefined) {
      parts.push(`${rule.storageClass} on ${rule.date}`);
    } else {
      parts.push(rule.storageClass);
    }
  }

  if (rule.expiration) {
    if (rule.expiration.days !== undefined) {
      parts.push(`expire after ${rule.expiration.days}d`);
    } else if (rule.expiration.date !== undefined) {
      parts.push(`expire on ${rule.expiration.date}`);
    }
  }

  const annotations: string[] = [];
  if (rule.filter?.prefix) annotations.push(`prefix=${rule.filter.prefix}`);
  if (rule.enabled === false) annotations.push('disabled');

  const head = parts.join(', ');
  return annotations.length > 0 ? `${head} (${annotations.join(', ')})` : head;
}

export function buildBucketInfo(data: BucketInfoResponse) {
  const info: { label: string; value: string }[] = [
    {
      label: 'Number of Objects',
      value: data.sizeInfo.numberOfObjects?.toString() ?? 'N/A',
    },
    {
      label: 'Total Size',
      value:
        data.sizeInfo.size !== undefined
          ? formatSize(data.sizeInfo.size)
          : 'N/A',
    },
    {
      label: 'All Versions Count',
      value: data.sizeInfo.numberOfObjectsAllVersions?.toString() ?? 'N/A',
    },
    { label: 'Default Tier', value: data.settings.defaultTier },
    {
      label: 'Snapshots Enabled',
      value: data.isSnapshotEnabled ? 'Yes' : 'No',
    },
    {
      label: 'Delete Protection',
      value: data.settings.deleteProtection ? 'Yes' : 'No',
    },
    {
      label: 'Allow Object ACL',
      value: data.settings.allowObjectAcl ? 'Yes' : 'No',
    },
    {
      label: 'Custom Domain',
      value: data.settings.customDomain ?? 'None',
    },
    {
      label: 'Has Forks',
      value: data.forkInfo?.hasChildren ? 'Yes' : 'No',
    },
  ];

  if (data.forkInfo?.parents?.length) {
    info.push({
      label: 'Forked From',
      value: data.forkInfo.parents[0].bucketName,
    });
    info.push({
      label: 'Fork Snapshot',
      value: data.forkInfo.parents[0].snapshot,
    });
  }

  if (data.settings.lifecycleRules?.length) {
    info.push({
      label: 'Lifecycle Rules',
      value: data.settings.lifecycleRules
        .map((r) => formatLifecycleRule(r))
        .join(', '),
    });
  }

  if (data.settings.corsRules.length) {
    info.push({
      label: 'CORS Rules',
      value: `${data.settings.corsRules.length} rule(s)`,
    });
  }

  if (data.settings.notifications) {
    info.push({
      label: 'Notifications',
      value:
        data.settings.notifications.enabled !== false ? 'Enabled' : 'Disabled',
    });
  }

  if (data.settings.dataMigration) {
    info.push({
      label: 'Data Migration',
      value: data.settings.dataMigration.endpoint
        ? `${data.settings.dataMigration.name ?? 'N/A'} (${data.settings.dataMigration.endpoint})`
        : (data.settings.dataMigration.name ?? 'Configured'),
    });
  }

  return info;
}
