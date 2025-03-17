import { getRandomInt } from '@andrew_l/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { parseToMongo as s } from './parseToMongo';

describe('parseToMongo', () => {
  it('should handle simple comparing', () => {
    expect(s('name = "andrew"')).toStrictEqual({
      name: 'andrew',
    });
  });

  it('should handle comparing with logical operators', () => {
    expect(s('name = "andrew" OR age > 5')).toStrictEqual({
      $or: [{ name: 'andrew' }, { age: { $gt: 5 } }],
    });
  });

  it('should handle comparing with complex logical operators', () => {
    expect(
      s('(role = "ADMIN" AND name = "andrew") OR age >= 18'),
    ).toStrictEqual({
      $or: [
        { $and: [{ role: 'ADMIN' }, { name: 'andrew' }] },
        { age: { $gte: 18 } },
      ],
    });
  });

  it('should handle comparing with same logical operators', () => {
    expect(s('role = "ADMIN" OR name = "andrew" OR age >= 18')).toStrictEqual({
      $or: [{ role: 'ADMIN' }, { name: 'andrew' }, { age: { $gte: 18 } }],
    });
  });

  describe('options.allowEmpty', () => {
    it('should be false by default', () => {
      expect(() => s('')).toThrowError('Search query cannot be empty');
    });

    it('should returns empty object when true', () => {
      expect(s('', { allowEmpty: true })).toStrictEqual({});
    });
  });

  describe('options.allowedKeys', () => {
    it('should accept all keys by default', () => {
      expect(s(`key_${getRandomInt(1, 10)}=1`)).toBeTruthy();
    });

    it('should accept provided keys', () => {
      expect(s('a=1', { allowedKeys: ['a'] })).toBeTruthy();
      expect(() => s('b=1', { allowedKeys: ['a'] })).toThrowError(
        'The search key "b" is not allowed',
      );
    });
  });

  describe('options.transform', () => {
    it('should not transform by default', () => {
      expect(s('a=1 AND b="2"')).toStrictEqual({
        $and: [{ a: 1 }, { b: '2' }],
      });
    });

    it('should execute global transform function', () => {
      const t1 = vi.fn((value: unknown, key: string) => value);
      const t2 = vi.fn((value: unknown, key: string) => value);

      s('a=1', { transform: t1 }); // direct way
      s('a=1', { transform: [t1, t2] }); // array way
      s('a=1', { transform: { '*': [t2] } }); // object way

      expect(t1).toBeCalledTimes(2);
      expect(t2).toBeCalledTimes(2);
    });

    it('should execute key transform function', () => {
      const t1 = vi.fn((value: unknown, key: string) => value);
      const t2 = vi.fn((value: unknown, key: string) => value);

      s('a=1', { transform: { a: t1 } }); // direct way
      s('a=1', { transform: { a: [t1, t2] } }); // array way

      expect(t1).toBeCalledTimes(2);
      expect(t2).toBeCalledTimes(1);
    });

    it('should execute chain of transform function.', () => {
      const t1 = vi.fn((value: unknown, key: string) => `t1`);
      const t2 = vi.fn((value: unknown, key: string) => `${value}:t2`);
      const result = {
        a: 't1:t2',
      };

      expect(s('a=1', { transform: [t1, t2] })).toStrictEqual(result);
      expect(s('a=1', { transform: { '*': [t1, t2] } })).toStrictEqual(result);
      expect(s('a=1', { transform: { a: [t1, t2] } })).toStrictEqual(result);
    });
  });

  describe('options.maxOps', () => {
    it('should be infinity by default', () => {
      expect(s('a=1 AND b=2 AND c=3')).toBeTruthy();
    });

    it('should accept only number value', () => {
      const errMessage = 'maxOps must be a number greater than zero';

      expect(() => s('abc', { maxOps: '1' as any })).toThrowError(errMessage);
      expect(() => s('abc', { maxOps: 0 })).toThrowError(errMessage);
      expect(() => s('abc', { maxOps: -1 })).toThrowError(errMessage);
      expect(() => s('abc', { maxOps: -Infinity })).toThrowError(errMessage);

      expect(s('a=1', { maxOps: 1 })).toBeTruthy();
      expect(s('a=1', { maxOps: Infinity })).toBeTruthy();
    });

    it('should throw error when max ops reached', () => {
      expect(() => s('a=1 AND a=2', { maxOps: 1 })).toThrowError(
        'Maximum search operations reached: 1',
      );
    });
  });
});
