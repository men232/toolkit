import { describe, expect, test } from 'vitest';
import { parseAlpha } from './parseAlpha';

describe('parseAlpha', () => {
  test('number', () => {
    expect(parseAlpha(1)).toBe(1);
  });

  test('string', () => {
    expect(parseAlpha('50%')).toBe(0.5);
  });

  test('number below range', () => {
    expect(parseAlpha(-1)).toBe(0);
  });

  test('string above range', () => {
    expect(parseAlpha('150%')).toBe(1);
  });

  test('string below range', () => {
    expect(parseAlpha('-150%')).toBe(0);
  });

  test('invalid', () => {
    expect(parseAlpha('hello')).toBe(1);
  });
});
