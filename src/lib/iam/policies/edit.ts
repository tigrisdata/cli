import { existsSync, readFileSync } from 'node:fs';
import enquirer from 'enquirer';
const { prompt } = enquirer;
import { getOption } from '../../../utils/options.js';
import { getLoginMethod } from '../../../auth/s3-client.js';
import { getAuthClient } from '../../../auth/client.js';
import { getSelectedOrganization } from '../../../auth/storage.js';
import { getTigrisConfig } from '../../../auth/config.js';
import {
  editPolicy,
  getPolicy,
  listPolicies,
  type PolicyDocument,
} from '@tigrisdata/iam';
import {
  printStart,
  printSuccess,
    printEmpty,
  msg,
} from '../../../utils/messages.js';
import { handleError } from '../../../utils/errors.js';
import { isJsonMode, jsonSuccess } from '../../../utils/output.js';
import { readStdin, parseDocument } from './utils.js';

const context = msg('iam policies', 'edit');

export default async function edit(options: Record<string, unknown>) {
  printStart(context);

  let resource = getOption<string>(options, ['resource']);
  const documentArg = getOption<string>(options, ['document', 'd']);
  const description = getOption<string>(options, ['description']);

  const loginMethod = await getLoginMethod();

  if (loginMethod !== 'oauth') {
    handleError({ message: 'Policies can only be edited when logged in via OAuth.\nRun "tigris login oauth" first.' });
  }

  const authClient = getAuthClient();
  const isAuthenticated = await authClient.isAuthenticated();

  if (!isAuthenticated) {
    handleError({ message: 'Not authenticated. Run "tigris login oauth" first.' });
  }

  const accessToken = await authClient.getAccessToken();
  const selectedOrg = getSelectedOrganization();
  const tigrisConfig = getTigrisConfig();

  const iamConfig = {
    sessionToken: accessToken,
    organizationId: selectedOrg ?? undefined,
    iamEndpoint: tigrisConfig.iamEndpoint,
  };

  // If no resource provided, list policies and let user select
  // But if stdin is piped, we can't use interactive selection
  if (!resource) {
    if (!process.stdin.isTTY) {
      handleError({ message: 'Policy ARN is required when piping document via stdin.' });
    }

    const { data: listData, error: listError } = await listPolicies({
      config: iamConfig,
    });

    if (listError) {
      handleError(listError);
    }

    if (!listData.policies || listData.policies.length === 0) {
      printEmpty(context);
      return;
    }

    const { selected } = await prompt<{ selected: string }>({
      type: 'select',
      name: 'selected',
      message: 'Select a policy to edit:',
      choices: listData.policies.map((p) => ({
        name: p.resource,
        message: `${p.name} (${p.resource})`,
      })),
    });

    resource = selected;
  }

  // Get document content (optional if only updating description)
  let newDocument: PolicyDocument | undefined;

  if (documentArg) {
    // Check if it's a file path or inline JSON
    let documentJson: string;
    if (existsSync(documentArg)) {
      documentJson = readFileSync(documentArg, 'utf-8');
    } else {
      // Assume it's inline JSON
      documentJson = documentArg;
    }
    try {
      newDocument = parseDocument(documentJson);
    } catch {
      handleError({ message: 'Invalid JSON in policy document' });
    }
  } else if (!process.stdin.isTTY && !description) {
    // Read from stdin only if no description provided (description-only update doesn't need stdin)
    const documentJson = await readStdin();
    try {
      newDocument = parseDocument(documentJson);
    } catch {
      handleError({ message: 'Invalid JSON in policy document' });
    }
  }

  if (!newDocument && !description) {
    handleError({ message: 'Either --document or --description is required.' });
  }

  // Fetch existing policy to fill in missing values
  const { data: existingPolicy, error: getError } = await getPolicy(resource, {
    config: iamConfig,
  });

  if (getError) {
    handleError(getError);
  }

  const { data, error } = await editPolicy(resource, {
    document: newDocument ?? existingPolicy.document,
    description: description ?? existingPolicy.description,
    config: iamConfig,
  });

  if (error) {
    handleError(error);
  }

  if (isJsonMode()) {
    jsonSuccess({ resource: data.resource });
    return;
  }
  printSuccess(context, { resource: data.resource });
}
