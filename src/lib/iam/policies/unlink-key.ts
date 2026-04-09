import enquirer from 'enquirer';
const { prompt } = enquirer;
import { getOAuthIAMConfig } from '@auth/iam.js';
import {
  detachPolicyFromAccessKey,
  getPolicy,
  listPolicies,
} from '@tigrisdata/iam';
import { failWithError } from '@utils/exit.js';
import { confirm, requireInteractive } from '@utils/interactive.js';
import { msg, printEmpty, printStart, printSuccess } from '@utils/messages.js';
import { getFormat, getOption } from '@utils/options.js';

const context = msg('iam policies', 'unlink-key');

export default async function unlinkKey(options: Record<string, unknown>) {
  printStart(context);

  const format = getFormat(options);

  let resource = getOption<string>(options, ['resource']);
  let id = getOption<string>(options, ['id']);
  const force = getOption<boolean>(options, ['yes', 'y', 'force']);

  const iamConfig = await getOAuthIAMConfig(context);

  // If no policy ARN provided, let user select
  if (!resource) {
    const { data: listData, error: listError } = await listPolicies({
      config: iamConfig,
    });

    if (listError) {
      failWithError(context, listError);
    }

    if (!listData.policies || listData.policies.length === 0) {
      printEmpty(context);
      return;
    }

    requireInteractive('Provide the policy ARN as a positional argument');

    const { selected } = await prompt<{ selected: string }>({
      type: 'select',
      name: 'selected',
      message: 'Select a policy:',
      choices: listData.policies.map((p) => ({
        name: p.resource,
        message: `${p.name} (${p.resource})`,
      })),
    });

    resource = selected;
  }

  // If no access key ID provided, let user select from attached keys
  if (!id) {
    requireInteractive('Use --id to specify the access key ID');

    const { data: policyData, error: policyError } = await getPolicy(resource, {
      config: iamConfig,
    });

    if (policyError) {
      failWithError(context, policyError);
    }

    if (!policyData.users || policyData.users.length === 0) {
      failWithError(context, 'No access keys are linked to this policy.');
    }

    const { selected } = await prompt<{ selected: string }>({
      type: 'select',
      name: 'selected',
      message: 'Select an access key to unlink:',
      choices: policyData.users.map((u) => ({
        name: u.id,
        message: `${u.name} (${u.id})`,
      })),
    });

    id = selected;
  }

  if (!force) {
    requireInteractive('Use --yes to skip confirmation');
    const confirmed = await confirm(
      `Unlink access key '${id}' from policy '${resource}'?`
    );
    if (!confirmed) {
      console.log('Aborted');
      return;
    }
  }

  const { error } = await detachPolicyFromAccessKey(id, resource, {
    config: iamConfig,
  });

  if (error) {
    failWithError(context, error);
  }

  if (format === 'json') {
    console.log(
      JSON.stringify({ action: 'unlinked', policyArn: resource, id })
    );
  }

  printSuccess(context);
}
