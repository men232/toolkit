import { expect, test } from 'vitest';
import { seriesList } from './seriesList';

test('seriesList', () => {
  expect(seriesList([1, 2, 3, 6, 7])).toStrictEqual([
    [1, 3],
    [6, 7],
  ]);
});

test('seriesList (1 item)', () => {
  expect(seriesList([1])).toStrictEqual([[1]]);

  expect(seriesList([1, 2, 4])).toStrictEqual([[1, 2], [4]]);

  expect(seriesList([])).toStrictEqual([]);
});

test('seriesList (3 items)', () => {
  expect(seriesList([1, 2, 4])).toStrictEqual([[1, 2], [4]]);
});

test('seriesList (empty)', () => {
  expect(seriesList([])).toStrictEqual([]);
});

test('seriesList (no series)', () => {
  expect(seriesList([1, 3])).toStrictEqual([[1], [3]]);
});
