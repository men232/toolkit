import { toMap } from '@/object';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { keyBy } from './keyBy';

describe('keyBy', () => {
  it('should map each element of an array by string key', () => {
    const people = [
      { name: 'mike', age: 20 },
      { name: 'jake', age: 30 },
    ];

    // const a1 = keyBy(people, 'age');
    // const a2 = keyBy(people, 'age2');
    // const b1 = keyBy(people, 'age', true);
    // const b2 = keyBy(people, 'age2', true);
    // const c1 = keyBy(people, v => v.age);
    // const c2 = keyBy(people, v => 'test');
    // const d1 = keyBy(people, v => v.age, true);
    // const d2 = keyBy(people, v => 'test', true);

    const result = keyBy(people, person => person.name);
    expect(result).toEqual(
      toMap({
        mike: { name: 'mike', age: 20 },
        jake: { name: 'jake', age: 30 },
      }),
    );
  });

  it('should map each element of an array by number key', () => {
    const people = [
      { name: 'mike', age: 20 },
      { name: 'jake', age: 30 },
    ];

    const result = keyBy(people, person => person.age);
    expect(result).toEqual(
      new Map([
        [20, { name: 'mike', age: 20 }],
        [30, { name: 'jake', age: 30 }],
      ]),
    );
  });

  it('should map each element of an array by symbol key', () => {
    const id1 = Symbol('id');
    const id2 = Symbol('id');
    const people = [
      { id: id1, name: 'mike', age: 20 },
      { id: id2, name: 'jake', age: 30 },
    ];

    const result = keyBy(people, person => person.id);
    expect(result).toEqual(
      toMap({
        [id1]: { id: id1, name: 'mike', age: 20 },
        [id2]: { id: id2, name: 'jake', age: 30 },
      }),
    );
  });

  it('should overwrite the value when encountering the same key', () => {
    const people = [
      { name: 'mike', age: 20 },
      { name: 'mike', age: 30 },
    ];

    const result = keyBy(people, person => person.name);

    expect(result).toEqual(toMap({ mike: { name: 'mike', age: 30 } }));
  });

  it('should handle empty array', () => {
    const people: Array<{ name: string; age: number }> = [];

    const result = keyBy(people, person => person.name);

    expect(result).toEqual(toMap({}));
  });
  it('types a key that is not a known field as one item per key', () => {
    type Row = { name: string };
    const rows = [
      { name: 'a', id: 1 },
      { name: 'b', id: 1 },
    ] as unknown as Row[];
    const result = keyBy(rows, 'id');

    expectTypeOf(result).toEqualTypeOf<Map<unknown, Row>>();
    expect(result.get(1)).toBe(rows[1]);
  });
});
