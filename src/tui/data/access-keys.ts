import {
  listAccessKeys,
  createAccessKey as sdkCreateAccessKey,
  removeAccessKey,
  getAccessKey,
  assignBucketRoles,
} from '@tigrisdata/iam';
import { getIAMConfig } from './iam-config.js';

export interface AccessKeyInfo {
  name: string;
  id: string;
  status: string;
  created: Date;
}

export async function fetchAccessKeys(): Promise<AccessKeyInfo[]> {
  const config = await getIAMConfig();

  const { data, error } = await listAccessKeys({ config });

  if (error) {
    throw new Error(error.message);
  }

  return (data.accessKeys || []).map((key) => ({
    name: key.name,
    id: key.id,
    status: key.status,
    created: key.createdAt,
  }));
}

export interface CreateAccessKeyResult {
  name: string;
  id: string;
  secret: string;
}

export async function createAccessKey(
  name: string
): Promise<CreateAccessKeyResult> {
  const config = await getIAMConfig();

  const { data, error } = await sdkCreateAccessKey(name, { config });

  if (error) {
    throw new Error(error.message);
  }

  return {
    name: data.name,
    id: data.id,
    secret: data.secret ?? '',
  };
}

export async function deleteAccessKey(id: string): Promise<void> {
  const config = await getIAMConfig();

  const { error } = await removeAccessKey(id, { config });

  if (error) {
    throw new Error(error.message);
  }
}

export interface AccessKeyDetail {
  name: string;
  id: string;
  status: string;
  created: string;
  roles: { bucket: string; role: string }[];
}

export async function fetchAccessKeyDetail(
  id: string
): Promise<AccessKeyDetail> {
  const config = await getIAMConfig();

  const { data, error } = await getAccessKey(id, { config });

  if (error) {
    throw new Error(error.message);
  }

  return {
    name: data.name,
    id: data.id,
    status: data.status,
    created: data.createdAt.toISOString(),
    roles: (data.roles ?? []).map((r) => ({
      bucket: r.bucket,
      role: r.role,
    })),
  };
}

export async function assignRolesToKey(
  id: string,
  roles: { bucket: string; role: 'Editor' | 'ReadOnly' | 'NamespaceAdmin' }[]
): Promise<void> {
  const config = await getIAMConfig();

  const { error } = await assignBucketRoles(id, roles, { config });

  if (error) {
    throw new Error(error.message);
  }
}
