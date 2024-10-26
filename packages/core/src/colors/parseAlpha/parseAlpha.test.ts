import { expect, test } from 'vitest';
import { parseAlpha } from './parseAlpha';

test('parseAlpha', () => {
  expect(parseAlpha(1)).toBe(1);
  expect(parseAlpha('50%')).toBe(0.5);

  expect(parseAlpha(-1)).toBe(0);
  expect(parseAlpha('150%')).toBe(1);
  expect(parseAlpha('-150%')).toBe(0);
});
