import { expect, test } from 'vitest';
import { checkBitmask } from './checkBitmask';

test('checkBitmask (Number)', () => {
  const scope = (1 << 1) | (1 << 3);

  expect(checkBitmask(scope, 1 << 2)).toBe(false);
  expect(checkBitmask(scope, 1 << 3)).toBe(true);
});

test('checkBitmask (Bigint)', () => {
  const scope = (1n << 1n) | (1n << 3n);

  expect(checkBitmask(scope, 1n << 2n)).toBe(false);
  expect(checkBitmask(scope, 1n << 3n)).toBe(true);
});
