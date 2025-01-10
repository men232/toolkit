import { describe, expect, it } from 'vitest';
import { getMostSpecificPaths } from './getMostSpecificPaths';

describe('getMostSpecificPaths', () => {
  it('should return only the most specific paths', () => {
    const input = [
      'profile',
      'profile.basic',
      'profile.basic.fullName',
      'profile.updatedAt',
    ];
    const expected = ['profile.basic.fullName', 'profile.updatedAt'];
    expect(getMostSpecificPaths(input)).toEqual(expected);
  });

  it('should handle a single path', () => {
    const input = ['profile'];
    const expected = ['profile'];
    expect(getMostSpecificPaths(input)).toEqual(expected);
  });

  it('should handle an empty array', () => {
    const input = [];
    const expected = [];
    expect(getMostSpecificPaths(input)).toEqual(expected);
  });

  it('should handle non-overlapping paths', () => {
    const input = ['profile', 'settings', 'dashboard'];
    const expected = ['profile', 'settings', 'dashboard'].sort();
    expect(getMostSpecificPaths(input)).toEqual(expected);
  });

  it('should handle deeply nested paths', () => {
    const input = ['a', 'a.b', 'a.b.c', 'a.b.c.d', 'x', 'x.y'];
    const expected = ['a.b.c.d', 'x.y'];
    expect(getMostSpecificPaths(input)).toEqual(expected);
  });

  it('should handle unsorted input paths', () => {
    const input = [
      'profile.updatedAt',
      'profile.basic',
      'profile',
      'profile.basic.fullName',
    ];
    const expected = ['profile.basic.fullName', 'profile.updatedAt'];
    expect(getMostSpecificPaths(input)).toEqual(expected);
  });

  it('should handle paths that are prefixes of others', () => {
    const input = ['a', 'a.b', 'a.b.c', 'a.b.c.d.e', 'a.b.c.d', 'a.x'];
    const expected = ['a.b.c.d.e', 'a.x'];
    expect(getMostSpecificPaths(input)).toEqual(expected);
  });

  it('should handle duplicate paths', () => {
    const input = [
      'profile',
      'profile',
      'profile.basic',
      'profile.basic',
      'profile.basic.fullName',
    ];
    const expected = ['profile.basic.fullName'];
    expect(getMostSpecificPaths(input)).toEqual(expected);
  });

  it('should not modify the original input array', () => {
    const input = ['profile', 'profile.basic', 'profile.basic.fullName'];
    const inputCopy = [...input];
    getMostSpecificPaths(input);
    expect(input).toEqual(inputCopy);
  });
});
