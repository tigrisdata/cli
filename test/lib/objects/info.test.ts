import { describe, expect, it } from 'vitest';

import { resolveObjectArgs } from '../../../src/lib/objects/info.js';

describe('resolveObjectArgs', () => {
  describe('two positional arguments (bucket + key)', () => {
    it('uses bucket and key directly', () => {
      expect(resolveObjectArgs('my-bucket', 'report.pdf')).toEqual({
        bucket: 'my-bucket',
        key: 'report.pdf',
      });
    });

    it('preserves nested key paths', () => {
      expect(resolveObjectArgs('my-bucket', 'docs/2024/report.pdf')).toEqual({
        bucket: 'my-bucket',
        key: 'docs/2024/report.pdf',
      });
    });
  });

  describe('single combined path (bucket arg only)', () => {
    it('parses bare bucket/key path', () => {
      expect(resolveObjectArgs('my-bucket/report.pdf')).toEqual({
        bucket: 'my-bucket',
        key: 'report.pdf',
      });
    });

    it('parses t3:// prefixed path', () => {
      expect(resolveObjectArgs('t3://my-bucket/report.pdf')).toEqual({
        bucket: 'my-bucket',
        key: 'report.pdf',
      });
    });

    it('parses tigris:// prefixed path', () => {
      expect(resolveObjectArgs('tigris://my-bucket/report.pdf')).toEqual({
        bucket: 'my-bucket',
        key: 'report.pdf',
      });
    });

    it('parses nested key from t3:// path', () => {
      expect(resolveObjectArgs('t3://my-bucket/docs/2024/report.pdf')).toEqual({
        bucket: 'my-bucket',
        key: 'docs/2024/report.pdf',
      });
    });

    it('returns empty key when only bucket name given', () => {
      expect(resolveObjectArgs('my-bucket')).toEqual({
        bucket: 'my-bucket',
        key: '',
      });
    });

    it('returns empty key for t3:// with bucket only', () => {
      expect(resolveObjectArgs('t3://my-bucket')).toEqual({
        bucket: 'my-bucket',
        key: '',
      });
    });
  });
});
