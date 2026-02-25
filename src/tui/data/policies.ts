import {
  listPolicies,
  addPolicy,
  deletePolicy as sdkDeletePolicy,
  editPolicy as sdkEditPolicy,
  getPolicy,
  type PolicyDocument,
} from '@tigrisdata/iam';
import { getIAMConfig } from './iam-config.js';

export interface PolicyInfo {
  name: string;
  id: string;
  resource: string;
  description: string;
  attachments: number;
  created: Date;
  updated: Date;
}

export async function fetchPolicies(): Promise<PolicyInfo[]> {
  const config = await getIAMConfig();

  const { data, error } = await listPolicies({ config });

  if (error) {
    throw new Error(error.message);
  }

  return (data.policies || []).map((policy) => ({
    name: policy.name,
    id: policy.id,
    resource: policy.resource,
    description: policy.description || '-',
    attachments: policy.attachmentCount,
    created: policy.createDate,
    updated: policy.updateDate,
  }));
}

export interface CreatePolicyParams {
  name: string;
  description: string;
  document: string; // JSON string
}

export async function createPolicy(
  params: CreatePolicyParams
): Promise<string> {
  const config = await getIAMConfig();

  let document: PolicyDocument;
  try {
    document = JSON.parse(params.document) as PolicyDocument;
  } catch {
    throw new Error('Invalid JSON in policy document');
  }

  const { data, error } = await addPolicy(params.name, {
    document,
    description: params.description,
    config,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.resource;
}

export async function deletePolicy(resource: string): Promise<void> {
  const config = await getIAMConfig();

  const { error } = await sdkDeletePolicy(resource, { config });

  if (error) {
    throw new Error(error.message);
  }
}

export interface PolicyDetail {
  name: string;
  id: string;
  resource: string;
  description: string;
  created: string;
  updated: string;
  document: string;
  users: string[];
}

export async function fetchPolicyDetail(
  resource: string
): Promise<PolicyDetail> {
  const config = await getIAMConfig();

  const { data, error } = await getPolicy(resource, { config });

  if (error) {
    throw new Error(error.message);
  }

  return {
    name: data.name,
    id: data.id,
    resource: data.resource,
    description: data.description || '-',
    created: data.createDate.toISOString(),
    updated: data.updateDate.toISOString(),
    document: JSON.stringify(data.document, null, 2),
    users: data.users ?? [],
  };
}

export interface EditPolicyParams {
  resource: string;
  description: string;
  document: string; // JSON string
}

export async function editPolicy(params: EditPolicyParams): Promise<void> {
  const config = await getIAMConfig();

  let document: PolicyDocument;
  try {
    document = JSON.parse(params.document) as PolicyDocument;
  } catch {
    throw new Error('Invalid JSON in policy document');
  }

  const { error } = await sdkEditPolicy(params.resource, {
    document,
    description: params.description,
    config,
  });

  if (error) {
    throw new Error(error.message);
  }
}
