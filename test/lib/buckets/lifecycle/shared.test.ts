import { describe, expect, it } from 'vitest';

import {
  expirationFromInput,
  transitionDeltaFromInput,
} from '../../../../src/lib/buckets/lifecycle/shared.js';

describe('transitionDeltaFromInput', () => {
  it('returns only the storage class when only --storage-class is set', () => {
    const delta = transitionDeltaFromInput({ storageClass: 'GLACIER' });
    expect(delta).toEqual({ storageClass: 'GLACIER' });
  });

  it('emits days and explicitly clears date when only --days is set', () => {
    // Regression: spreading ...target before this delta needs to override
    // an existing target.date. Without `date: undefined`, the spread leaves
    // both populated and the API rejects the rule.
    const delta = transitionDeltaFromInput({ days: '30' });
    expect(delta).toEqual({ days: 30, date: undefined });
  });

  it('emits date and explicitly clears days when only --date is set', () => {
    const delta = transitionDeltaFromInput({ date: '2026-06-01' });
    expect(delta).toEqual({ date: '2026-06-01', days: undefined });
  });

  it('returns an empty delta when no timing or class is set', () => {
    const delta = transitionDeltaFromInput({});
    expect(delta).toEqual({});
  });
});

describe('expirationFromInput', () => {
  it('emits days and explicitly clears date when --expire-days is set', () => {
    const expiration = expirationFromInput({ expireDays: '7' });
    expect(expiration).toEqual({ days: 7, date: undefined });
  });

  it('emits date and explicitly clears days when --expire-date is set', () => {
    const expiration = expirationFromInput({ expireDate: '2026-12-31' });
    expect(expiration).toEqual({ date: '2026-12-31', days: undefined });
  });

  it('returns undefined when neither expire flag is set', () => {
    expect(expirationFromInput({})).toBeUndefined();
  });
});
