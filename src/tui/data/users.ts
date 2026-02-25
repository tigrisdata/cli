import {
  listUsers,
  inviteUser as sdkInviteUser,
  removeUser as sdkRemoveUser,
  updateUserRole as sdkUpdateUserRole,
  revokeInvitation as sdkRevokeInvitation,
} from '@tigrisdata/iam';
import { getIAMConfig } from './iam-config.js';

export interface UserInfo {
  email: string;
  name: string;
  role: string;
  userId: string;
}

export interface InvitationInfo {
  id: string;
  email: string;
  role: string;
  status: string;
  validUntil: string;
}

export interface UsersAndInvitations {
  users: UserInfo[];
  invitations: InvitationInfo[];
}

export async function fetchUsers(): Promise<UsersAndInvitations> {
  const config = await getIAMConfig();

  const { data, error } = await listUsers({ config });

  if (error) {
    throw new Error(error.message);
  }

  const users = data.users.map((user) => ({
    email: user.email,
    name: user.userName || '-',
    role: user.isOrgOwner ? 'owner' : user.role,
    userId: user.userId,
  }));

  const invitations = data.invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    validUntil: inv.validUntil.toLocaleDateString(),
  }));

  return { users, invitations };
}

export async function inviteUser(
  email: string,
  role: 'admin' | 'member'
): Promise<void> {
  const config = await getIAMConfig();

  const { error } = await sdkInviteUser([{ email, role }], { config });

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeUser(userId: string): Promise<void> {
  const config = await getIAMConfig();

  const { error } = await sdkRemoveUser([userId], { config });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateUserRole(
  userId: string,
  role: 'admin' | 'member'
): Promise<void> {
  const config = await getIAMConfig();

  const { error } = await sdkUpdateUserRole([{ userId, role }], { config });

  if (error) {
    throw new Error(error.message);
  }
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const config = await getIAMConfig();

  const { error } = await sdkRevokeInvitation([invitationId], { config });

  if (error) {
    throw new Error(error.message);
  }
}
