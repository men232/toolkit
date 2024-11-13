import { describe, expect, test } from 'vitest';
import { objectId } from './objectId';

describe('objectId', () => {
  test('basic', () => {
    expect(objectId(1731530972436).slice(0, 8)).toBe('673510dc');
  });
});
