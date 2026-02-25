import { useCallback, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAsync } from '../hooks/use-async.js';
import { useListNav } from '../hooks/use-list-nav.js';
import { useModal } from '../hooks/use-modal.js';
import { ListView } from '../components/list/list-view.js';
import {
  fetchOrganizations,
  createOrganization,
  selectOrganization,
  type OrgInfo,
} from '../data/organizations.js';
import type { ViewProps, Column } from '../types.js';

const COLUMNS: Column<OrgInfo>[] = [
  {
    key: 'selected',
    header: ' ',
    width: 2,
    render: (v) => (v ? '*' : ' '),
  },
  { key: 'name', header: 'Name', width: 30 },
  { key: 'id', header: 'ID', width: 36 },
  { key: 'slug', header: 'Slug', width: 20 },
];

export function Organizations({ state, dispatch }: ViewProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const fetcher = useCallback(() => fetchOrganizations(), [refreshKey]);
  const { data, isLoading, error, refresh } = useAsync(fetcher, [refreshKey]);
  const items = data ?? [];
  const modal = useModal(dispatch);

  const hasModal = state.modalStack.length > 0;

  const nav = useListNav<OrgInfo>({
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

      // Create org
      if (input === 'n') {
        modal.form({
          title: 'Create Organization',
          fields: [
            { name: 'name', label: 'Organization Name', type: 'text', required: true },
          ],
          onSubmit: async (values) => {
            try {
              await createOrganization(values.name!);
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

      // Switch active org and drill into Buckets
      if (key.return && nav.selectedItem) {
        const org = nav.selectedItem;
        const switchAndDrill = async () => {
          try {
            await selectOrganization(org.id);
            dispatch({
              type: 'SET_ORG',
              orgName: org.name,
              orgId: org.id,
            });
            // Drill into Buckets for this org
            dispatch({ type: 'SET_VIEW', view: 'buckets' });
          } catch (err) {
            dispatch({
              type: 'SET_ERROR',
              error: err instanceof Error ? err.message : String(err),
            });
          }
        };

        // If already selected, just drill in without confirmation
        if (org.selected) {
          dispatch({ type: 'SET_VIEW', view: 'buckets' });
        } else {
          modal.confirm({
            title: 'Switch Organization',
            message: `Switch to "${org.name}" and view its buckets?`,
            onConfirm: switchAndDrill,
          });
        }
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
        emptyMessage="No organizations found."
      />
    </Box>
  );
}
