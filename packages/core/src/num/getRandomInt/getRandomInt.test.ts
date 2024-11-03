import { expect, test } from 'vitest';
import { getRandomInt } from './getRandomInt';

/**
 * Random testing 0__o
 */

test('getRandomInt', () => {
  expect(getRandomInt(5, 10)).lessThan(11).greaterThan(4);
});
