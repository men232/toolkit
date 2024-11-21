import { describe, expect, it } from 'vitest';
import { sameKeys } from '../utils/object';

describe('utils', () => {
  describe('sameKeys', () => {
    it('should handle empty arguments', () => {
      expect(sameKeys()).toStrictEqual([]);
    });

    it('should handle two arguments', () => {
      expect(sameKeys({ a: 1, b: 1 }, { a: 1, c: 1 })).toStrictEqual(['a']);
    });

    it('should handle three arguments', () => {
      expect(
        sameKeys({ a: 1, b: 1 }, { a: 1, c: 1 }, { a: 1, c: 1 }),
      ).toStrictEqual(['a']);
    });
  });
});
