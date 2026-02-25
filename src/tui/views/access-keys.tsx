import { useCallback, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAsync } from '../hooks/use-async.js';
import { useListNav } from '../hooks/use-list-nav.js';
import { useModal } from '../hooks/use-modal.js';
import { ListView } from '../components/list/list-view.js';
import {
  fetchAccessKeys,
  createAccessKey,
  deleteAccessKey,
  fetchAccessKeyDetail,
  assignRolesToKey,
  type AccessKeyInfo,
} from '../data/access-keys.js';
import type { ViewProps, Column } from '../types.js';

const COLUMNS: Column<AccessKeyInfo>[] = [
  { key: 'name', header: 'Name', width: 30 },
  { key: 'id', header: 'ID', width: 28 },
  { key: 'status', header: 'Status', width: 10 },
  {
    key: 'created',
    header: 'Created',
    width: 20,
    render: (v) => (v instanceof Date ? v.toLocaleDateString() : String(v)),
  },
];

export function AccessKeys({ state, dispatch }: ViewProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const fetcher = useCallback(() => fetchAccessKeys(), [refreshKey]);
  const { data, isLoading, error, refresh } = useAsync(fetcher, [refreshKey]);
  const items = data ?? [];
  const modal = useModal(dispatch);

  const hasModal = state.modalStack.length > 0;

  const nav = useListNav<AccessKeyInfo>({
    items,
    filterKey: 'name',
    enabled: !hasModal && !isLoading,
  });

  useInput(
    (input, key) => {
      if (hasModal) return;

      if (input === 'r') {
        refresh();
        setRefreshKey((k) => k + 1);
        return;
      }

      // Create
      if (input === 'n') {
        modal.form({
          title: 'Create Access Key',
          fields: [
            { name: 'name', label: 'Key Name', type: 'text', required: true },
          ],
          onSubmit: async (values) => {
            try {
              const result = await createAccessKey(values.name!);
              modal.detail({
                title: 'Access Key Created',
                entries: [
                  { label: 'Name', value: result.name },
                  { label: 'Access Key ID', value: result.id },
                  { label: 'Secret Key', value: result.secret },
                  { label: 'WARNING', value: 'Save this secret now. It will not be shown again.' },
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

      // Delete
      if (input === 'd' && nav.selectedItem) {
        const item = nav.selectedItem;
        modal.confirm({
          title: 'Delete Access Key',
          message: `Delete access key "${item.name}" (${item.id})?`,
          onConfirm: async () => {
            try {
              await deleteAccessKey(item.id);
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

      // Detail
      if (key.return && nav.selectedItem) {
        const item = nav.selectedItem;
        fetchAccessKeyDetail(item.id)
          .then((detail) => {
            const entries = [
              { label: 'Name', value: detail.name },
              { label: 'ID', value: detail.id },
              { label: 'Status', value: detail.status },
              { label: 'Created', value: detail.created },
            ];
            if (detail.roles.length > 0) {
              entries.push({
                label: 'Roles',
                value: detail.roles
                  .map((r) => `${r.bucket}: ${r.role}`)
                  .join(', '),
              });
            } else {
              entries.push({ label: 'Roles', value: 'None assigned' });
            }
            modal.detail({
              title: `Access Key: ${detail.name}`,
              entries,
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

      // Assign roles
      if (input === 'a' && nav.selectedItem) {
        const item = nav.selectedItem;
        modal.form({
          title: `Assign Roles to ${item.name}`,
          fields: [
            { name: 'bucket', label: 'Bucket Name', type: 'text', required: true },
            {
              name: 'role',
              label: 'Role',
              type: 'select',
              options: [
                { label: 'Editor', value: 'Editor' },
                { label: 'ReadOnly', value: 'ReadOnly' },
              ],
            },
          ],
          onSubmit: async (values) => {
            try {
              await assignRolesToKey(item.id, [
                {
                  bucket: values.bucket!,
                  role: values.role as 'Editor' | 'ReadOnly',
                },
              ]);
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

  return (
    <Box flexDirection="column">
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
        emptyMessage="No access keys found. Press 'n' to create one."
      />
    </Box>
  );
}
