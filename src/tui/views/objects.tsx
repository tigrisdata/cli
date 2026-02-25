import { useCallback, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAsync } from '../hooks/use-async.js';
import { useListNav } from '../hooks/use-list-nav.js';
import { useModal } from '../hooks/use-modal.js';
import { ListView } from '../components/list/list-view.js';
import {
  fetchObjects,
  deleteObject,
  fetchObjectMeta,
  type ObjectInfo,
} from '../data/objects.js';
import type { ViewProps, Column } from '../types.js';

const COLUMNS: Column<ObjectInfo>[] = [
  {
    key: 'key',
    header: 'Name',
    width: 44,
    render: (v, item) => (item.isFolder ? `${String(v)}` : String(v)),
  },
  { key: 'size', header: 'Size', width: 12 },
  {
    key: 'modified',
    header: 'Modified',
    width: 24,
    render: (v) => (v instanceof Date ? v.toLocaleDateString() : String(v)),
  },
];

export function Objects({ state, dispatch }: ViewProps) {
  const bucket = state.selectedBucket!;
  const prefix = state.selectedPrefix;
  const [refreshKey, setRefreshKey] = useState(0);

  const fetcher = useCallback(
    () => fetchObjects(bucket, prefix || undefined),
    [bucket, prefix, refreshKey]
  );
  const { data, isLoading, error, refresh } = useAsync(fetcher, [
    bucket,
    prefix,
    refreshKey,
  ]);
  const items = data ?? [];
  const modal = useModal(dispatch);

  const hasModal = state.modalStack.length > 0;

  const nav = useListNav<ObjectInfo>({
    items,
    filterKey: 'key',
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

      // Back (Esc or Backspace)
      if (key.escape || key.backspace || key.delete) {
        dispatch({ type: 'POP_VIEW' });
        return;
      }

      // Enter = drill into folder or view metadata
      if (key.return && nav.selectedItem) {
        const item = nav.selectedItem;
        if (item.isFolder) {
          // Navigate into folder
          const newPrefix = prefix
            ? `${prefix}${item.key}`
            : item.key;
          dispatch({
            type: 'PUSH_VIEW',
            view: 'objects',
            bucket,
            prefix: newPrefix,
          });
          return;
        }
        // Show object metadata
        const fullKey = prefix ? `${prefix}${item.key}` : item.key;
        fetchObjectMeta(bucket, fullKey)
          .then((meta) => {
            modal.detail({
              title: `Object: ${item.key}`,
              entries: [
                { label: 'Path', value: meta.path },
                { label: 'Size', value: meta.size },
                { label: 'Content-Type', value: meta.contentType },
                { label: 'Disposition', value: meta.contentDisposition },
                { label: 'Modified', value: meta.modified },
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

      // Delete object
      if (input === 'd' && nav.selectedItem && !nav.selectedItem.isFolder) {
        const item = nav.selectedItem;
        const fullKey = prefix ? `${prefix}${item.key}` : item.key;
        modal.confirm({
          title: 'Delete Object',
          message: `Delete "${item.key}" from ${bucket}?`,
          onConfirm: async () => {
            try {
              await deleteObject(bucket, fullKey);
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
    },
    { isActive: !hasModal }
  );

  // Build breadcrumb
  const breadcrumb = `${bucket}/${prefix}`;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text dimColor>Location: </Text>
        <Text bold color="cyan">{breadcrumb}</Text>
      </Box>
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
        emptyMessage="No objects in this location."
      />
    </Box>
  );
}
