import { useCallback, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAsync } from '../hooks/use-async.js';
import { useListNav } from '../hooks/use-list-nav.js';
import { useModal } from '../hooks/use-modal.js';
import { ListView } from '../components/list/list-view.js';
import {
  fetchPolicies,
  createPolicy,
  deletePolicy,
  fetchPolicyDetail,
  type PolicyInfo,
} from '../data/policies.js';
import type { ViewProps, Column } from '../types.js';

const COLUMNS: Column<PolicyInfo>[] = [
  { key: 'name', header: 'Name', width: 24 },
  { key: 'resource', header: 'Resource', width: 36 },
  { key: 'description', header: 'Description', width: 24 },
  { key: 'attachments', header: 'Att.', width: 5 },
  {
    key: 'created',
    header: 'Created',
    width: 20,
    render: (v) => (v instanceof Date ? v.toLocaleDateString() : String(v)),
  },
];

export function Policies({ state, dispatch }: ViewProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const fetcher = useCallback(() => fetchPolicies(), [refreshKey]);
  const { data, isLoading, error, refresh } = useAsync(fetcher, [refreshKey]);
  const items = data ?? [];
  const modal = useModal(dispatch);

  const hasModal = state.modalStack.length > 0;

  const nav = useListNav<PolicyInfo>({
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
          title: 'Create Policy',
          fields: [
            { name: 'name', label: 'Policy Name', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'text' },
            {
              name: 'document',
              label: 'Policy Document (JSON)',
              type: 'text',
              required: true,
              placeholder: '{"version":"...","statements":[...]}',
            },
          ],
          onSubmit: async (values) => {
            try {
              await createPolicy({
                name: values.name!,
                description: values.description ?? '',
                document: values.document!,
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
          title: 'Delete Policy',
          message: `Delete policy "${item.name}"?`,
          onConfirm: async () => {
            try {
              await deletePolicy(item.resource);
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
        fetchPolicyDetail(item.resource)
          .then((detail) => {
            modal.detail({
              title: `Policy: ${detail.name}`,
              entries: [
                { label: 'ID', value: detail.id },
                { label: 'Resource', value: detail.resource },
                { label: 'Description', value: detail.description },
                { label: 'Created', value: detail.created },
                { label: 'Updated', value: detail.updated },
                { label: 'Document', value: detail.document },
                {
                  label: 'Users',
                  value: detail.users.length > 0 ? detail.users.join(', ') : 'None',
                },
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

      // Edit — requires fetching current state first
      if (input === 'e' && nav.selectedItem) {
        const item = nav.selectedItem;
        fetchPolicyDetail(item.resource)
          .then((detail) => {
            modal.form({
              title: `Edit Policy: ${detail.name}`,
              fields: [
                {
                  name: 'description',
                  label: 'Description',
                  type: 'text',
                  defaultValue: detail.description,
                },
                {
                  name: 'document',
                  label: 'Policy Document (JSON)',
                  type: 'text',
                  required: true,
                  defaultValue: detail.document,
                },
              ],
              onSubmit: async (values) => {
                try {
                  const { editPolicy } = await import('../data/policies.js');
                  await editPolicy({
                    resource: item.resource,
                    description: values.description ?? '',
                    document: values.document!,
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
          })
          .catch((err) => {
            dispatch({
              type: 'SET_ERROR',
              error: err instanceof Error ? err.message : String(err),
            });
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
        emptyMessage="No policies found. Press 'n' to create one."
      />
    </Box>
  );
}
