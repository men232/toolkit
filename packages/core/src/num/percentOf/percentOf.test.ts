import { expect, test } from 'vitest';
import { percentOf } from './percentOf';

test('percentOf', () => {
  expect(percentOf(200, 20)).toBe(40);
});
