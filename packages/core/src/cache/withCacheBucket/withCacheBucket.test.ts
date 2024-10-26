import { expect, test } from 'vitest';
import { withCacheBucket } from './withCacheBucket';

test('rnd must returns the same result', () => {
  const rnd = withCacheBucket({ sizeMs: 100, capacity: 1 }, () =>
    Math.random(),
  );

  expect(rnd()).toBe(rnd());
});

test('check size ms', async () => {
  let called = 0;

  const rnd = withCacheBucket({ sizeMs: 100, capacity: 1 }, () => {
    called++;
    return Math.random();
  });

  rnd();
  expect(1).toBe(called);

  await new Promise(resolve => setTimeout(resolve, 101));

  rnd();
  expect(2).toBe(called);
});

test('check capacity', () => {
  let called = 0;

  const rnd = withCacheBucket({ sizeMs: 1000, capacity: 3 }, (_: number) => {
    called++;
    return Math.random();
  });

  rnd(1);
  rnd(2);
  rnd(3);
  rnd(4);
  rnd(5);

  expect(5).toBe(called);

  // last 3 items must be cached
  rnd(3);
  rnd(4);
  rnd(5);

  expect(5).toBe(called);
});
