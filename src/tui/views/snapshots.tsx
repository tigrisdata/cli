import { useCallback, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAsync } from '../hooks/use-async.js';
import { useListNav } from '../hooks/use-list-nav.js';
import { useModal } from '../hooks/use-modal.js';
import { ListView } from '../components/list/list-view.js';
import { fetchSnapshots, takeSnapshot, type SnapshotInfo } from '../data/snapshots.js';
import { createFork } from '../data/forks.js';
import type { ViewProps, Column } from '../types.js';

const COLUMNS: Column<SnapshotInfo>[] = [
  { key: 'name', header: 'Name', width: 30 },
  { key: 'version', header: 'Version', width: 40 },
  {
    key: 'created',
    header: 'Created',
    width: 24,
    render: (v) => (v instanceof Date ? v.toLocaleDateString() : String(v)),
  },
];

export function Snapshots({ state, dispatch }: ViewProps) {
  const bucket = state.selectedBucket;
  const [refreshKey, setRefreshKey] = useState(0);

  const fetcher = useCallback(
    () => (bucket ? fetchSnapshots(bucket) : Promise.resolve([])),
    [bucket, refreshKey]
  );
  const { data, isLoading, error, refresh } = useAsync(fetcher, [bucket, refreshKey]);
  const items = data ?? [];
  const modal = useModal(dispatch);

  const hasModal = state.modalStack.length > 0;

  const nav = useListNav<SnapshotInfo>({
    items,
    filterKey: 'name',
    enabled: !hasModal && !isLoading,
  });

  useInput(
    (input) => {
      if (hasModal) return;

      if (input === 'r') {
        refresh();
        setRefreshKey((k) => k + 1);
        return;
      }

      // Take snapshot
      if (input === 'n') {
        if (!bucket) {
          dispatch({
            type: 'SET_ERROR',
            error: 'Select a bucket first (go to Buckets view, select one, press "s").',
          });
          return;
        }
        modal.form({
          title: `Take Snapshot of ${bucket}`,
          fields: [
            { name: 'name', label: 'Snapshot Name (optional)', type: 'text' },
          ],
          onSubmit: async (values) => {
            try {
              const version = await takeSnapshot(bucket, values.name || undefined);
              modal.detail({
                title: 'Snapshot Created',
                entries: [
                  { label: 'Bucket', value: bucket },
                  { label: 'Version', value: version },
                ],
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

      // Create fork from selected snapshot
      if (input === 'f' && nav.selectedItem) {
        if (!bucket) {
          dispatch({
            type: 'SET_ERROR',
            error: 'No bucket context for fork.',
          });
          return;
        }
        const snapshot = nav.selectedItem;
        modal.form({
          title: 'Create Fork',
          fields: [
            { name: 'forkName', label: 'Fork Bucket Name', type: 'text', required: true },
          ],
          onSubmit: async (values) => {
            try {
              await createFork({
                forkName: values.forkName!,
                sourceBucket: bucket,
                sourceSnapshot: snapshot.version,
              });
              modal.detail({
                title: 'Fork Created',
                entries: [
                  { label: 'Fork', value: values.forkName! },
                  { label: 'Source', value: bucket },
                  { label: 'Snapshot', value: snapshot.version },
                ],
              });
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
    },
    { isActive: !hasModal }
  );

  return (
    <Box flexDirection="column">
      {bucket ? (
        <Box marginBottom={1}>
          <Text dimColor>Snapshots for: </Text>
          <Text bold color="cyan">{bucket}</Text>
        </Box>
      ) : (
        <Box marginBottom={1}>
          <Text color="yellow">
            No bucket selected. Go to Buckets (3), select a bucket, and press 's'.
          </Text>
        </Box>
      )}
      {state.globalError && <Text color="red">{state.globalError}</Text>}
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
        emptyMessage={bucket ? 'No snapshots found. Press "n" to create one.' : 'Select a bucket first.'}
      />
    </Box>
  );
}
