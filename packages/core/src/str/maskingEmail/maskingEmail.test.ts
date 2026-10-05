import { describe, expect, test } from 'vitest';
import { maskingEmail } from './maskingEmail';

describe('maskingEmail', () => {
  test('len >= 3', () => {
    expect(maskingEmail('andrew@gmail.com')).toBe('a****w@gmail.com');
    expect(maskingEmail('a.b_c@x.io')).toBe('a***c@x.io');
    expect(maskingEmail('john.doe+tag@x.io')).toBe('j**********g@x.io');
  });

  test('len 2', () => {
    expect(maskingEmail('an@gmail.com')).toBe('a*@gmail.com');
  });

  test('len 1', () => {
    expect(maskingEmail('a@gmail.com')).toBe('*@gmail.com');
  });
});
