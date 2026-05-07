import type { TigrisStorageConfig } from '@auth/provider.js';
import {
  type BucketLifecycleRule,
  getBucketInfo,
  setBucketLifecycle,
} from '@tigrisdata/storage';
import { failWithError } from '@utils/exit.js';
import { type MessageContext } from '@utils/messages.js';
import { getOption } from '@utils/options.js';

const VALID_TRANSITION_CLASSES = [
  'STANDARD_IA',
  'GLACIER',
  'GLACIER_IR',
] as const;

type TransitionClass = (typeof VALID_TRANSITION_CLASSES)[number];

function isTransitionClass(value: string): value is TransitionClass {
  return (VALID_TRANSITION_CLASSES as readonly string[]).includes(value);
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(new Date(value).getTime());
}

type RuleInput = {
  prefix?: string;
  storageClass?: string;
  days?: string;
  date?: string;
  expireDays?: string;
  expireDate?: string;
  enable?: boolean;
  disable?: boolean;
};

export function readRuleInput(options: Record<string, unknown>): RuleInput {
  return {
    prefix: getOption<string>(options, ['prefix']),
    storageClass: getOption<string>(options, ['storage-class', 'storageClass']),
    days: getOption<string>(options, ['days']),
    date: getOption<string>(options, ['date']),
    expireDays: getOption<string>(options, ['expire-days', 'expireDays']),
    expireDate: getOption<string>(options, ['expire-date', 'expireDate']),
    enable: getOption<boolean>(options, ['enable']),
    disable: getOption<boolean>(options, ['disable']),
  };
}

/**
 * Validates transition/expiration field combinations. Returns an error
 * message if invalid. Does NOT enforce "at least one of" — callers do
 * that based on whether they're creating or editing.
 */
export function validateRuleFieldCombinations(
  input: RuleInput
): string | undefined {
  if (input.enable && input.disable) {
    return 'Cannot use both --enable and --disable';
  }

  if (
    (input.days !== undefined || input.date !== undefined) &&
    !input.storageClass
  ) {
    return '--storage-class is required when setting --days or --date';
  }

  if (input.storageClass && !isTransitionClass(input.storageClass)) {
    return `--storage-class must be one of: ${VALID_TRANSITION_CLASSES.join(
      ', '
    )} (STANDARD is not a valid transition target)`;
  }

  if (input.days !== undefined && input.date !== undefined) {
    return 'Cannot specify both --days and --date';
  }

  if (
    input.days !== undefined &&
    (isNaN(Number(input.days)) || Number(input.days) <= 0)
  ) {
    return '--days must be a positive number';
  }

  if (input.date !== undefined && !isIsoDate(input.date)) {
    return '--date must be a valid ISO-8601 date (e.g. 2026-06-01)';
  }

  if (input.expireDays !== undefined && input.expireDate !== undefined) {
    return 'Cannot specify both --expire-days and --expire-date';
  }

  if (
    input.expireDays !== undefined &&
    (isNaN(Number(input.expireDays)) || Number(input.expireDays) <= 0)
  ) {
    return '--expire-days must be a positive number';
  }

  if (input.expireDate !== undefined && !isIsoDate(input.expireDate)) {
    return '--expire-date must be a valid ISO-8601 date (e.g. 2026-06-01)';
  }

  return undefined;
}

/**
 * Build a transition delta to merge into a rule.
 * Only includes fields the user explicitly set.
 */
export function transitionDeltaFromInput(input: RuleInput): {
  storageClass?: TransitionClass;
  days?: number;
  date?: string;
} {
  return {
    ...(input.storageClass
      ? { storageClass: input.storageClass as TransitionClass }
      : {}),
    ...(input.days !== undefined ? { days: Number(input.days) } : {}),
    ...(input.date !== undefined ? { date: input.date } : {}),
  };
}

/**
 * Build an expiration object from input, or undefined if neither
 * --expire-days nor --expire-date was provided.
 */
export function expirationFromInput(
  input: RuleInput
): { days?: number; date?: string } | undefined {
  if (input.expireDays !== undefined) {
    return { days: Number(input.expireDays) };
  }
  if (input.expireDate !== undefined) {
    return { date: input.expireDate };
  }
  return undefined;
}

/**
 * Resolve `--enable` / `--disable` into a boolean, or undefined when
 * neither flag was set.
 */
export function enabledFromInput(input: RuleInput): boolean | undefined {
  if (input.enable) return true;
  if (input.disable) return false;
  return undefined;
}

/**
 * Fetch existing lifecycle rules. Existing rules are passed through to
 * `submitRules` with their ids so the SDK's auto-match doesn't silently
 * overwrite a rule when there's exactly one update + one existing.
 */
export async function fetchExistingRules(
  context: MessageContext,
  bucket: string,
  config: TigrisStorageConfig
): Promise<BucketLifecycleRule[]> {
  const { data, error } = await getBucketInfo(bucket, { config });
  if (error) {
    failWithError(context, error);
  }
  return data?.settings.lifecycleRules ?? [];
}

export async function submitRules(
  context: MessageContext,
  bucket: string,
  rules: BucketLifecycleRule[],
  config: TigrisStorageConfig
): Promise<void> {
  const { error } = await setBucketLifecycle(bucket, {
    lifecycleRules: rules,
    config,
  });
  if (error) {
    failWithError(context, error);
  }
}

export function formatTransitionCell(rule: BucketLifecycleRule): string {
  if (!rule.storageClass) return '-';
  if (rule.days !== undefined)
    return `${rule.storageClass} after ${rule.days}d`;
  if (rule.date !== undefined) return `${rule.storageClass} on ${rule.date}`;
  return rule.storageClass;
}

export function formatExpirationCell(rule: BucketLifecycleRule): string {
  if (!rule.expiration) return '-';
  if (rule.expiration.days !== undefined) return `${rule.expiration.days}d`;
  if (rule.expiration.date !== undefined) return rule.expiration.date;
  return '-';
}
