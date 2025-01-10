import { toMap } from '@/object';
import type { AnyFunction } from '@/types';
import { describe, expect, it } from 'vitest';
import { groupBy } from './groupBy';

function makeTest(resultModifier: AnyFunction, objectMode: boolean) {
  it('should map each element of an array by string key', () => {
    const people = [
      { name: 'mike', age: 20 },
      { name: 'jake', age: 30 },
    ];

    const result = groupBy(people, person => person.name, objectMode as any);
    expect(result).toEqual(
      resultModifier(
        toMap({
          mike: [{ name: 'mike', age: 20 }],
          jake: [{ name: 'jake', age: 30 }],
        }),
      ),
    );
  });

  it('should map each element of an array by number key', () => {
    const people = [
      { name: 'mike', age: 20 },
      { name: 'jake', age: 30 },
    ];

    const result = groupBy(people, person => person.age, objectMode as any);
    expect(result).toEqual(
      resultModifier(
        new Map([
          [20, [{ name: 'mike', age: 20 }]],
          [30, [{ name: 'jake', age: 30 }]],
        ]),
      ),
    );
  });

  it('should map each element of an array by symbol key', () => {
    const id1 = Symbol('id');
    const id2 = Symbol('id');
    const people = [
      { id: id1, name: 'mike', age: 20 },
      { id: id2, name: 'jake', age: 30 },
    ];

    const result = groupBy(people, person => person.id, objectMode as any);
    expect(result).toEqual(
      resultModifier(
        toMap({
          [id1]: [{ id: id1, name: 'mike', age: 20 }],
          [id2]: [{ id: id2, name: 'jake', age: 30 }],
        }),
      ),
    );
  });

  it('should group the value when encountering the same key', () => {
    const people = [
      { name: 'mike', age: 20 },
      { name: 'mike', age: 30 },
    ];

    const result = groupBy(people, person => person.name, objectMode as any);

    expect(result).toEqual(resultModifier(toMap({ mike: people })));
  });

  it('should handle empty array', () => {
    const people: Array<{ name: string; age: number }> = [];

    const result = groupBy(people, person => person.name, objectMode as any);

    expect(result).toEqual(resultModifier(toMap({})));
  });
}

describe('groupBy', () => {
  describe('objectMode', () => {
    makeTest(map => {
      const result: any = {};

      for (const [key, value] of map.entries()) {
        result[key] = value;
      }

      return result;
    }, true);
  });

  describe('mapMode', () => {
    makeTest(map => map, false);
  });
});
