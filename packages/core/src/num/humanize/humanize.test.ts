import { describe, expect, test } from 'vitest';
import { humanize } from './humanize';

describe('humanize', () => {
  test('less then 1k', () => {
    expect(humanize(512)).toBe('512');
  });

  test('1k', () => {
    expect(humanize(1000)).toBe('1k');
    expect(humanize(1540)).toBe('1.5k');
    expect(humanize(1550, 2)).toBe('1.55k');
  });

  test('1M', () => {
    expect(humanize(1000000)).toBe('1M');
    expect(humanize(1500000)).toBe('1.5M');
  });

  test('1B', () => {
    expect(humanize(1000000000)).toBe('1B');
    expect(humanize(1500000000)).toBe('1.5B');
  });

  test('1T', () => {
    expect(humanize(1000000000000)).toBe('1T');
    expect(humanize(1500000000000)).toBe('1.5T');
  });
  test('rolls over to the next suffix', () => {
    expect(humanize(999949)).toBe('999.9k');
    expect(humanize(999950)).toBe('1M');
    expect(humanize(999999)).toBe('1M');
    expect(humanize(999999999)).toBe('1B');
  });

  test('rounds half up', () => {
    expect(humanize(1950)).toBe('2k');
    expect(humanize(1949)).toBe('1.9k');
    expect(humanize(1500, 0)).toBe('2k');
    expect(humanize(-1950)).toBe('-2k');
  });

  test('keeps significant decimals and drops trailing zeros', () => {
    expect(humanize(1050, 2)).toBe('1.05k');
    expect(humanize(1500, 2)).toBe('1.5k');
    expect(humanize(1999)).toBe('2k');
  });

  test('huge numbers', () => {
    expect(humanize(999999999999999)).toBe('1000T');
    expect(humanize(1e16)).toBe('1.0x10^16');
  });
});
