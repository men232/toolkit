import { describe, expect, it } from 'vitest';
import { withResolve } from './withResolve';

function testExecution(
  getCacheKeyVariants: any[],
  describe: string,
  ...args: any[]
) {
  it(describe, () => {
    let called = 0;

    const fn = withResolve((a?: any) => {
      called++;
      return new Promise(resolve => setTimeout(resolve, 0));
    }, getCacheKeyVariants);

    if (args.length) {
      for (const arg of args) {
        fn(arg);
        fn(arg);
      }

      expect(called).toBe(args.length);
    } else {
      fn();
      fn();
      expect(called).toBe(1);
    }
  });
}

describe('withResolve', () => {
  testExecution([], 'one execution at the same time');
  testExecution([], 'one execution with same arguments the same time', [
    '1',
    '2',
  ]);
  testExecution([], 'one execution with same object arguments the same time', [
    { a: 1 },
    { b: 1 },
  ]);

  testExecution(
    [(user: any) => user.id],
    'one execution at the same time with cache custom key',
    [
      { id: 1, name: 'Andrew' },
      { id: 1, name: 'John' },
    ],
  );
});
