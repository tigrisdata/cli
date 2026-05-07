import { getStorageConfigWithOrg } from '@auth/provider.js';
import type { BucketLifecycleRule } from '@tigrisdata/storage';
import { failWithError } from '@utils/exit.js';
import { msg, printStart, printSuccess } from '@utils/messages.js';
import { getFormat, getOption } from '@utils/options.js';

import {
  enabledFromInput,
  expirationFromInput,
  fetchExistingRules,
  readRuleInput,
  submitRules,
  transitionDeltaFromInput,
  validateRuleFieldCombinations,
} from './shared.js';

const context = msg('buckets lifecycle', 'edit');

export default async function edit(options: Record<string, unknown>) {
  printStart(context);

  const format = getFormat(options);
  const name = getOption<string>(options, ['name']);
  const id = getOption<string>(options, ['id']);

  if (!name) {
    failWithError(context, 'Bucket name is required');
  }
  if (!id) {
    failWithError(context, 'Rule id is required');
  }

  const input = readRuleInput(options);

  const validationError = validateRuleFieldCombinations(input);
  if (validationError) {
    failWithError(context, validationError);
  }

  const transition = transitionDeltaFromInput(input);
  const expiration = expirationFromInput(input);
  const enabled = enabledFromInput(input);

  const hasAnyChange =
    transition.storageClass !== undefined ||
    transition.days !== undefined ||
    transition.date !== undefined ||
    expiration !== undefined ||
    enabled !== undefined ||
    input.prefix !== undefined;

  if (!hasAnyChange) {
    failWithError(
      context,
      'Provide at least one field to change (--storage-class, --days, --date, --expire-days, --expire-date, --prefix, --enable, --disable)'
    );
  }

  const config = await getStorageConfigWithOrg();
  const existing = await fetchExistingRules(context, name, config);

  const target = existing.find((r) => r.id === id);
  if (!target) {
    failWithError(
      context,
      `No lifecycle rule with id "${id}" found. Run \`tigris buckets lifecycle list ${name}\` to see ids.`
    );
  }

  const updated: BucketLifecycleRule = {
    ...target,
    ...transition,
    ...(expiration ? { expiration } : {}),
    ...(input.prefix !== undefined ? { filter: { prefix: input.prefix } } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
  };

  const merged = existing.map((r) => (r.id === id ? updated : r));

  await submitRules(context, name, merged, config);

  if (format === 'json') {
    console.log(JSON.stringify({ action: 'updated', bucket: name, id }));
  }

  printSuccess(context, { name, id });
}
