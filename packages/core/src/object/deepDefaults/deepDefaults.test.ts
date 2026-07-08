import { noop } from '@/is';
import { describe, expect, it } from 'vitest';
import { deepClone } from '../deepClone';
import { deepDefaults } from './deepDefaults';

describe('deepDefaults', () => {
  it('should deep assign source properties if missing on `object`', () => {
    const object = { a: { b: 2 }, d: 4 };
    const source = { a: { b: 3, c: 3 }, e: 5 };
    const expected = { a: { b: 2, c: 3 }, d: 4, e: 5 };

    expect(deepDefaults(object, source)).toEqual(expected);
  });

  it('should accept multiple sources', () => {
    const source1 = { a: { b: 3 } };
    const source2 = { a: { c: 3 } };
    const source3 = { a: { b: 3, c: 3 } };
    const source4 = { a: { c: 4 } };
    const expected = { a: { b: 2, c: 3 } };

    expect(deepDefaults({ a: { b: 2 } }, source1, source2)).toEqual(expected);
    expect(deepDefaults({ a: { b: 2 } }, source3, source4)).toEqual(expected);
  });

  it('should not overwrite `null` values', () => {
    const object = { a: { b: null } };
    const source = { a: { b: 2 } };
    const actual = deepDefaults(object, source);

    expect((actual as any).a.b).toBe(null);
  });

  it('should not overwrite regexp values', () => {
    const object = { a: { b: /x/ } };
    const source = { a: { b: /y/ } };
    const actual = deepDefaults(object, source);

    expect(actual.a.b).toEqual(/x/);
  });

  it('should not convert function properties to objects', () => {
    const actual = deepDefaults({}, { a: noop });
    expect(actual.a).toBe(noop);

    const actual2 = deepDefaults({}, { a: { b: noop } });
    expect(actual2.a.b).toBe(noop);
  });

  it('should overwrite `undefined` values', () => {
    const object = { a: { b: undefined } };
    const source = { a: { b: 2 } };
    const actual = deepDefaults(object, source);

    expect((actual as any).a.b).toBe(2);
  });

  it('should assign `undefined` values', () => {
    const source = { a: undefined, b: { c: undefined, d: 1 } };
    const expected = deepClone(source);
    const actual = deepDefaults({}, source);

    expect(actual).toEqual(expected);
  });

  it('should merge sources containing circular references', () => {
    const object = {
      foo: { b: { c: { d: {} } } },
      bar: { a: 2 },
    };

    const source = {
      foo: { b: { c: { d: {} } } },
      bar: {},
    };

    object.foo.b.c.d = object;
    source.foo.b.c.d = source;
    (source.bar as any).b = source.foo.b;

    const actual = deepDefaults(object, source);

    expect((actual as any).bar.b).toBe(actual.foo.b);
    expect((actual as any).foo.b.c.d).toBe((actual as any).foo.b.c.d.foo.b.c.d);
  });

  it('should not modify sources', () => {
    const source1 = { a: 1, b: { c: 2 } };
    const source2 = { b: { c: 3, d: 3 } };
    const actual = deepDefaults({}, source1, source2);

    expect(actual).toEqual({ a: 1, b: { c: 2, d: 3 } });
    expect(source1).toEqual({ a: 1, b: { c: 2 } });
    expect(source2).toEqual({ b: { c: 3, d: 3 } });
  });

  it('should not attempt a merge of a string into an array', () => {
    const actual = deepDefaults({ a: ['abc'] }, { a: 'abc' });
    expect(actual.a).toEqual(['abc']);
  });

  it('should handle null or undefined sources', () => {
    // null 소스 테스트
    const target1 = { a: 1 };
    const result1 = deepDefaults(target1, null as any);
    expect(result1).toEqual({ a: 1 }); // 대상 객체가 변경되지 않아야 함

    // undefined 소스 테스트
    const target2 = { b: 2 };
    const result2 = deepDefaults(target2, undefined as any);
    expect(result2).toEqual({ b: 2 }); // 대상 객체가 변경되지 않아야 함

    const result3 = deepDefaults(target2, { d: 4 }, { d: 4 }, { d: 4 });
    expect(result3).toEqual({ b: 2, d: 4 });
  });

  it('should not indirectly merge `Object` properties', () => {
    deepDefaults({}, { constructor: { a: 1 } });

    const actual = 'a' in Object;
    delete (Object as any).a;

    expect(actual).toBe(false);
  });

  describe('deepDefaults edge cases', () => {
    it('should not assign values that are the same as their destinations', () => {
      ['a', ['a'], { a: 1 }, NaN].forEach(value => {
        const object = {};
        let pass = true;

        Object.defineProperty(object, 'a', {
          configurable: true,
          enumerable: true,
          get: () => value,
          set: () => {
            pass = false;
          },
        });

        deepDefaults(object, { a: value });
        expect(pass).toBe(true);
      });
    });

    it('should coerce primitives to objects', () => {
      const primitives = [Boolean(), Number(), String()];

      const expected = primitives.map(value => {
        const object = Object(value);
        object.a = 1;
        return object;
      });

      const actual = primitives.map(value => {
        return deepDefaults(value as any, { a: 1 });
      });

      expect(actual).toEqual(expected);
    });

    it('should assign own and inherited string keyed source properties', () => {
      function Foo(this: any) {
        this.a = 1;
      }
      Foo.prototype.b = 2;

      const expected = { a: 1, b: 2 };
      // eslint-disable-next-line
      // @ts-ignore
      expect(deepDefaults({}, new Foo())).toEqual(expected);
    });

    it('should not skip a trailing function source', () => {
      function fn() {}
      fn.b = 2;

      expect(deepDefaults({}, { a: 1 }, fn)).toEqual({ a: 1, b: 2 });
    });

    it('should not error on nullish sources', () => {
      expect(deepDefaults({ a: 1 }, undefined as any, { b: 2 }, null)).toEqual({
        a: 1,
        b: 2,
      });
    });

    it('should create an object when `object` is nullish', () => {
      const source = { a: 1 };
      const values = [null, undefined];

      const actual1 = values.map(value => {
        const object = deepDefaults(value as any, source);
        return object !== source && object.a === 1;
      });

      expect(actual1).toEqual([true, true]);

      const actual2 = values.map(value => {
        return Object.keys(deepDefaults(value as any)).length === 0;
      });

      expect(actual2).toEqual([true, true]);
    });

    it('should work as an iteratee for methods like reduce', () => {
      const array = [{ a: 1 }, { b: 2 }, { c: 3 }];
      const expected = { a: 0, b: 2, c: 3 };

      function fn() {}
      fn.a = array[0];
      fn.b = array[1];
      fn.c = array[2];

      expect(
        array.reduce((result, value) => deepDefaults(result, value), { a: 0 }),
      ).toEqual(expected);

      const result = { a: 0 };
      for (const key in fn) {
        if (Object.hasOwn(fn, key)) {
          deepDefaults(result, (fn as any)[key as any] as any);
        }
      }
      expect(result).toEqual(expected);
    });
  });

  it('should work with objects in arrays', () => {
    const target = { a: [{ foo: 1 }] };
    const source = { a: [{ bar: 2 }] };

    const expected = { a: [{ foo: 1, bar: 2 }] };

    expect(deepDefaults(target, source)).toEqual(expected);
  });

  it('should append additional elements from the source array to the target array if the source array is longer than the target array', () => {
    const target = { a: [{ foo: 1 }] };
    const source = { a: [{ foo: 2 }, { some: 'hello' }] };

    const expected = { a: [{ foo: 1 }, { some: 'hello' }] };

    expect(deepDefaults(target, source)).toEqual(expected);
  });
});
