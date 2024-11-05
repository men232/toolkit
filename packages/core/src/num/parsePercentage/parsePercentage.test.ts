import { describe, expect, test } from 'vitest';
import { parsePercentage } from './parsePercentage';

describe('parsePercentage', () => {
  test('string', () => {
    expect(parsePercentage('99%')).toBe(99);
  });

  test('number', () => {
    expect(parsePercentage(99)).toBe(99);
  });

  test('decimal', () => {
    expect(parsePercentage(99.53)).toBe(99.53);
  });

  test('> 100', () => {
    expect(parsePercentage(199.53)).toBe(100);
  });

  test('< 0', () => {
    expect(parsePercentage(-25)).toBe(0);
  });

  test('invalid', () => {
    expect(parsePercentage('test')).toBe(0);
  });
});
