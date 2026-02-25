import { useCallback, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAsync } from '../hooks/use-async.js';
import { useListNav } from '../hooks/use-list-nav.js';
import { useModal } from '../hooks/use-modal.js';
import { ListView } from '../components/list/list-view.js';
import {
  fetchBuckets,
  createBucket,
  deleteBucket,
  fetchBucketDetail,
  updateBucketSettings,
  type BucketInfo,
} from '../data/buckets.js';
import type { ViewProps, Column } from '../types.js';

const COLUMNS: Column<BucketInfo>[] = [
  { key: 'name', header: 'Name', width: 40 },
  {
    key: 'created',
    header: 'Created',
    width: 24,
    render: (v) => (v instanceof Date ? v.toLocaleDateString() : String(v)),
  },
];

export function Buckets({ state, dispatch }: ViewProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const fetcher = useCallback(() => fetchBuckets(), [refreshKey]);
  const { data, isLoading, error, refresh } = useAsync(fetcher, [refreshKey]);
  const items = data ?? [];
  const modal = useModal(dispatch);

  const hasModal = state.modalStack.length > 0;

  const nav = useListNav<BucketInfo>({
    items,
    filterKey: 'name',
    enabled: !hasModal && !isLoading,
  });

  useInput(
    (input, key) => {
      if (hasModal) return;

      // Refresh
      if (input === 'r') {
        refresh();
        setRefreshKey((k) => k + 1);
        return;
      }

      // New bucket
      if (input === 'n') {
        modal.form({
          title: 'Create Bucket',
          fields: [
            { name: 'name', label: 'Bucket Name', type: 'text', required: true },
            {
              name: 'access',
              label: 'Access',
              type: 'select',
              options: [
                { label: 'Private', value: 'private' },
                { label: 'Public', value: 'public' },
              ],
              defaultValue: 'private',
            },
            {
              name: 'defaultTier',
              label: 'Storage Tier',
              type: 'select',
              options: [
                { label: 'Standard', value: 'STANDARD' },
                { label: 'Infrequent Access', value: 'STANDARD_IA' },
                { label: 'Glacier IR', value: 'GLACIER_IR' },
              ],
              defaultValue: 'STANDARD',
            },
          ],
          onSubmit: async (values) => {
            try {
              await createBucket({
                name: values.name!,
                access: values.access as 'public' | 'private',
                defaultTier: values.defaultTier,
              });
              refresh();
              setRefreshKey((k) => k + 1);
            } catch (err) {
              dispatch({
                type: 'SET_ERROR',
                error: err instanceof Error ? err.message : String(err),
              });
            }
          },
        });
        return;
      }

      // Delete bucket
      if (input === 'd' && nav.selectedItem) {
        const bucket = nav.selectedItem;
        modal.confirm({
          title: 'Delete Bucket',
          message: `Are you sure you want to delete "${bucket.name}"? This cannot be undone.`,
          onConfirm: async () => {
            try {
              await deleteBucket(bucket.name);
              refresh();
              setRefreshKey((k) => k + 1);
            } catch (err) {
              dispatch({
                type: 'SET_ERROR',
                error: err instanceof Error ? err.message : String(err),
              });
            }
          },
        });
        return;
      }

      // Edit bucket settings
      if (input === 'e' && nav.selectedItem) {
        const bucket = nav.selectedItem;
        modal.form({
          title: `Edit ${bucket.name}`,
          fields: [
            {
              name: 'access',
              label: 'Access',
              type: 'select',
              options: [
                { label: 'Private', value: 'private' },
                { label: 'Public', value: 'public' },
              ],
            },
          ],
          onSubmit: async (values) => {
            try {
              await updateBucketSettings({
                name: bucket.name,
                access: values.access as 'public' | 'private',
              });
              refresh();
              setRefreshKey((k) => k + 1);
            } catch (err) {
              dispatch({
                type: 'SET_ERROR',
                error: err instanceof Error ? err.message : String(err),
              });
            }
          },
        });
        return;
      }

      // Info
      if (input === 'i' && nav.selectedItem) {
        const bucket = nav.selectedItem;
        fetchBucketDetail(bucket.name)
          .then((detail) => {
            modal.detail({
              title: `Bucket: ${bucket.name}`,
              entries: [
                { label: 'Objects', value: detail.numberOfObjects },
                { label: 'Total Size', value: detail.totalSize },
                { label: 'Snapshots', value: detail.snapshotsEnabled ? 'Enabled' : 'Disabled' },
                { label: 'Default Tier', value: detail.defaultTier },
                { label: 'Object ACL', value: detail.allowObjectAcl ? 'Yes' : 'No' },
                { label: 'Has Forks', value: detail.hasForks ? 'Yes' : 'No' },
                ...(detail.forkedFrom
                  ? [
                      { label: 'Forked From', value: detail.forkedFrom },
                      { label: 'Fork Snapshot', value: detail.forkSnapshot ?? '' },
                    ]
                  : []),
              ],
            });
          })
          .catch((err) => {
            dispatch({
              type: 'SET_ERROR',
              error: err instanceof Error ? err.message : String(err),
            });
          });
        return;
      }

      // Browse objects (Enter)
      if (key.return && nav.selectedItem) {
        dispatch({
          type: 'PUSH_VIEW',
          view: 'objects',
          bucket: nav.selectedItem.name,
          prefix: '',
        });
        return;
      }

      // Snapshots view for selected bucket
      if (input === 's' && nav.selectedItem) {
        dispatch({
          type: 'PUSH_VIEW',
          view: 'snapshots',
          bucket: nav.selectedItem.name,
        });
        return;
      }
    },
    { isActive: !hasModal }
  );

  return (
    <Box flexDirection="column">
      {state.globalError && (
        <Text color="red">{state.globalError}</Text>
      )}
      <ListView
        items={nav.filteredItems}
        columns={COLUMNS}
        selectedIndex={nav.selectedIndex}
        scrollOffset={nav.scrollOffset}
        visibleHeight={nav.visibleHeight}
        isLoading={isLoading}
        error={error}
        filterText={nav.filterText}
        isFiltering={nav.isFiltering}
        emptyMessage="No buckets found. Press 'n' to create one."
      />
    </Box>
  );
}
