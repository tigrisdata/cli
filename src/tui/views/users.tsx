import { useCallback, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAsync } from '../hooks/use-async.js';
import { useListNav } from '../hooks/use-list-nav.js';
import { useModal } from '../hooks/use-modal.js';
import { ListView } from '../components/list/list-view.js';
import {
  fetchUsers,
  inviteUser,
  removeUser,
  updateUserRole,
  revokeInvitation,
  type UserInfo,
  type InvitationInfo,
} from '../data/users.js';
import type { ViewProps, Column } from '../types.js';

const USER_COLUMNS: Column<UserInfo>[] = [
  { key: 'email', header: 'Email', width: 32 },
  { key: 'name', header: 'Name', width: 20 },
  { key: 'role', header: 'Role', width: 10 },
  { key: 'userId', header: 'User ID', width: 28 },
];

const INVITATION_COLUMNS: Column<InvitationInfo>[] = [
  { key: 'email', header: 'Email', width: 32 },
  { key: 'role', header: 'Role', width: 10 },
  { key: 'status', header: 'Status', width: 12 },
  { key: 'validUntil', header: 'Valid Until', width: 16 },
];

export function Users({ state, dispatch }: ViewProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInvitations, setShowInvitations] = useState(false);

  const fetcher = useCallback(() => fetchUsers(), [refreshKey]);
  const { data, isLoading, error, refresh } = useAsync(fetcher, [refreshKey]);
  const modal = useModal(dispatch);

  const users = data?.users ?? [];
  const invitations = data?.invitations ?? [];

  const hasModal = state.modalStack.length > 0;

  const userNav = useListNav<UserInfo>({
    items: users,
    filterKey: 'email',
    enabled: !hasModal && !isLoading && !showInvitations,
  });

  const invNav = useListNav<InvitationInfo>({
    items: invitations,
    filterKey: 'email',
    enabled: !hasModal && !isLoading && showInvitations,
  });

  useInput(
    (input, key) => {
      if (hasModal) return;

      if (input === 'r') {
        refresh();
        setRefreshKey((k) => k + 1);
        return;
      }

      // Toggle members/invitations
      if (key.tab) {
        setShowInvitations((v) => !v);
        return;
      }

      // Invite
      if (input === 'n') {
        modal.form({
          title: 'Invite User',
          fields: [
            { name: 'email', label: 'Email', type: 'text', required: true },
            {
              name: 'role',
              label: 'Role',
              type: 'select',
              options: [
                { label: 'Member', value: 'member' },
                { label: 'Admin', value: 'admin' },
              ],
              defaultValue: 'member',
            },
          ],
          onSubmit: async (values) => {
            try {
              await inviteUser(
                values.email!,
                values.role as 'admin' | 'member'
              );
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

      // Delete/Remove
      if (input === 'd') {
        if (!showInvitations && userNav.selectedItem) {
          const user = userNav.selectedItem;
          modal.confirm({
            title: 'Remove User',
            message: `Remove "${user.email}" from the organization?`,
            onConfirm: async () => {
              try {
                await removeUser(user.userId);
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
        } else if (showInvitations && invNav.selectedItem) {
          const inv = invNav.selectedItem;
          modal.confirm({
            title: 'Revoke Invitation',
            message: `Revoke invitation for "${inv.email}"?`,
            onConfirm: async () => {
              try {
                await revokeInvitation(inv.id);
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
        }
        return;
      }

      // Change role
      if (input === 'e' && !showInvitations && userNav.selectedItem) {
        const user = userNav.selectedItem;
        modal.form({
          title: `Change Role: ${user.email}`,
          fields: [
            {
              name: 'role',
              label: 'Role',
              type: 'select',
              options: [
                { label: 'Member', value: 'member' },
                { label: 'Admin', value: 'admin' },
              ],
              defaultValue: user.role === 'owner' ? 'admin' : user.role,
            },
          ],
          onSubmit: async (values) => {
            try {
              await updateUserRole(
                user.userId,
                values.role as 'admin' | 'member'
              );
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
      <Box gap={2} marginBottom={1}>
        <Text bold={!showInvitations} inverse={!showInvitations}>
          {' '}
          Members ({users.length}){' '}
        </Text>
        <Text bold={showInvitations} inverse={showInvitations}>
          {' '}
          Invitations ({invitations.length}){' '}
        </Text>
        <Text dimColor>(Tab to switch)</Text>
      </Box>
      {state.globalError && <Text color="red">{state.globalError}</Text>}
      {showInvitations ? (
        <ListView
          items={invNav.filteredItems}
          columns={INVITATION_COLUMNS}
          selectedIndex={invNav.selectedIndex}
          scrollOffset={invNav.scrollOffset}
          visibleHeight={invNav.visibleHeight}
          isLoading={isLoading}
          error={error}
          filterText={invNav.filterText}
          isFiltering={invNav.isFiltering}
          emptyMessage="No pending invitations."
        />
      ) : (
        <ListView
          items={userNav.filteredItems}
          columns={USER_COLUMNS}
          selectedIndex={userNav.selectedIndex}
          scrollOffset={userNav.scrollOffset}
          visibleHeight={userNav.visibleHeight}
          isLoading={isLoading}
          error={error}
          filterText={userNav.filterText}
          isFiltering={userNav.isFiltering}
          emptyMessage="No users found."
        />
      )}
    </Box>
  );
}
