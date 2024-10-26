import { expect, test } from 'vitest';
import { luminance } from '../luminance';
import { contrastRatio } from './contrastRatio';

test('contrastRatio', () => {
  const l1 = luminance([255, 255, 255, 1]);
  const l2 = luminance([0, 0, 0, 1]);

  expect(contrastRatio(l1, l2)).toBe(21);
});
