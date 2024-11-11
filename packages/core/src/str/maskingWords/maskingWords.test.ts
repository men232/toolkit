import { describe, expect, test } from 'vitest';
import { maskingWords } from './maskingWords';

describe('maskingWords', () => {
  test('few words', () => {
    expect(maskingWords('hello world')).toBe('h**o w**d');
  });

  test('one word', () => {
    expect(maskingWords('andrew')).toBe('a***w');
  });

  test('len 2', () => {
    expect(maskingWords('an')).toBe('a*');
  });

  test('len 1', () => {
    expect(maskingWords('a')).toBe('*');
  });

  test('with char', () => {
    expect(maskingWords('hello world', 'X')).toBe('hXXo wXXd');
  });
});
