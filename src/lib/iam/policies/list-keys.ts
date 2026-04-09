import enquirer from 'enquirer';
const { prompt } = enquirer;
import { getOAuthIAMConfig } from '@auth/iam.js';
import { getPolicy, listPolicies } from '@tigrisdata/iam';
import { failWithError } from '@utils/exit.js';
import { formatOutput } from '@utils/format.js';
import { requireInteractive } from '@utils/interactive.js';
import { msg, printEmpty, printStart, printSuccess } from '@utils/messages.js';
import { getFormat, getOption } from '@utils/options.js';

const context = msg('iam policies', 'list-keys');

export default async function listKeys(options: Record<string, unknown>) {
  printStart(context);

  const format = getFormat(options);

  let resource = getOption<string>(options, ['resource']);

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

  const { data, error } = await getPolicy(resource, { config: iamConfig });

  if (error) {
    failWithError(context, error);
  }

  if (!data.users || data.users.length === 0) {
    printEmpty(context);
    return;
  }

  const keys = data.users.map((u) => ({ name: u.name, id: u.id }));

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'id', header: 'ID' },
  ];

  const output = formatOutput(keys, format!, 'keys', 'key', columns);

  console.log(output);

  printSuccess(context, { count: keys.length });
}
