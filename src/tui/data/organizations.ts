import {
  listOrganizations,
  createOrganization as sdkCreateOrg,
} from '@tigrisdata/iam';
import { getStorageConfig } from '../../auth/s3-client.js';
import {
  getSelectedOrganization,
  storeSelectedOrganization,
} from '../../auth/storage.js';

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  selected: boolean;
}

export async function fetchOrganizations(): Promise<OrgInfo[]> {
  // listOrganizations uses storage config, not IAM config
  const config = await getStorageConfig();
  const { data, error } = await listOrganizations({ config });

  if (error) {
    throw new Error(error.message);
  }

  const currentSelection = getSelectedOrganization();
  return (data?.organizations ?? []).map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    selected: org.id === currentSelection,
  }));
}

export async function createOrganization(name: string): Promise<string> {
  const config = await getStorageConfig();
  const { data, error } = await sdkCreateOrg(name, { config });

  if (error) {
    throw new Error(error.message);
  }

  return data.id;
}

export async function selectOrganization(orgId: string): Promise<void> {
  await storeSelectedOrganization(orgId);
}
