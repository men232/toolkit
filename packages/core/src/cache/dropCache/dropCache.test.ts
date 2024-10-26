import { expect, test } from 'vitest';
import { withCache } from '../withCache';
import { dropCache } from './dropCache';

test('dropCache', () => {
  let called = 0;

  const rnd = withCache(() => {
    called++;
    return Math.random();
  });

  rnd();
  rnd();
  rnd();

  expect(1).toBe(called);

  dropCache(rnd);

  rnd();
  rnd();
  rnd();

  expect(2).toBe(called);
});

test('with arguments', () => {
  let called = 0;

  const rnd = withCache((_: number) => {
    called++;
    return Math.random();
  });

  rnd(1);
  rnd(2);
  rnd(3);

  rnd(1);
  rnd(2);
  rnd(3);

  expect(3).toBe(called);

  dropCache(rnd, 1);
  dropCache(rnd, 2);
  dropCache(rnd, 3);

  rnd(1);
  rnd(2);
  rnd(3);

  rnd(1);
  rnd(2);
  rnd(3);

  expect(6).toBe(called);
});
