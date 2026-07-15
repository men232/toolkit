import { AssertionError } from '@/errors/AssertionError';
import { describe, expect, it } from 'vitest';
import * as assert from './assert';

describe('ok', () => {
  it('passes for truthy values', () => {
    expect(() => assert.ok(1)).not.toThrow();
    expect(() => assert.ok('x')).not.toThrow();
    expect(() => assert.ok({})).not.toThrow();
  });

  it('throws an AssertionError for falsy values', () => {
    expect(() => assert.ok(0)).toThrow(AssertionError);
    expect(() => assert.ok('')).toThrow(AssertionError);
    expect(() => assert.ok(null)).toThrow(AssertionError);
    expect(() => assert.ok(undefined)).toThrow(AssertionError);
  });

  it('uses a custom string message', () => {
    expect(() => assert.ok(false, 'nope')).toThrow('nope');
  });

  it('rethrows a provided Error instance as-is', () => {
    const err = new TypeError('boom');
    expect(() => assert.ok(false, err)).toThrow(err);
  });
});

describe('equal', () => {
  it('passes when values are strictly equal', () => {
    expect(() => assert.equal(1, 1)).not.toThrow();
  });

  it('does not throw on inequality (known bug: missing throw)', () => {
    expect(() => assert.equal(1, 2)).toThrow();
  });
});

describe('notEmpty', () => {
  it('passes for non-empty values', () => {
    expect(() => assert.notEmpty('x')).not.toThrow();
    expect(() => assert.notEmpty([1])).not.toThrow();
    expect(() => assert.notEmpty({ a: 1 })).not.toThrow();
    expect(() => assert.notEmpty(0)).not.toThrow();
    expect(() => assert.notEmpty(false)).not.toThrow();
  });

  it('throws for empty values', () => {
    expect(() => assert.notEmpty('')).toThrow(AssertionError);
    expect(() => assert.notEmpty([])).toThrow(AssertionError);
    expect(() => assert.notEmpty({})).toThrow(AssertionError);
    expect(() => assert.notEmpty(null)).toThrow(AssertionError);
    expect(() => assert.notEmpty(undefined)).toThrow(AssertionError);
  });
});

describe('object', () => {
  it('passes for plain objects', () => {
    expect(() => assert.object({})).not.toThrow();
    expect(() => assert.object({ a: 1 })).not.toThrow();
  });

  it('throws for non-objects (including arrays and null)', () => {
    expect(() => assert.object([])).toThrow(AssertionError);
    expect(() => assert.object(null)).toThrow(AssertionError);
    expect(() => assert.object('x')).toThrow(AssertionError);
    expect(() => assert.object(1)).toThrow(AssertionError);
  });
});

describe('string', () => {
  it('passes for strings', () => {
    expect(() => assert.string('')).not.toThrow();
    expect(() => assert.string('x')).not.toThrow();
  });

  it('throws for non-strings', () => {
    expect(() => assert.string(1)).toThrow(AssertionError);
    expect(() => assert.string(null)).toThrow(AssertionError);
  });
});

describe('boolean', () => {
  it('passes for booleans', () => {
    expect(() => assert.boolean(true)).not.toThrow();
    expect(() => assert.boolean(false)).not.toThrow();
  });

  it('throws for non-booleans', () => {
    expect(() => assert.boolean(0)).toThrow(AssertionError);
    expect(() => assert.boolean('true')).toThrow(AssertionError);
  });
});

describe('notEmptyString', () => {
  it('passes for non-blank strings', () => {
    expect(() => assert.notEmptyString('x')).not.toThrow();
    expect(() => assert.notEmptyString('  x  ')).not.toThrow();
  });

  it('throws for empty or whitespace-only strings', () => {
    expect(() => assert.notEmptyString('')).toThrow(AssertionError);
    expect(() => assert.notEmptyString('   ')).toThrow(AssertionError);
  });

  it('throws for non-strings', () => {
    expect(() => assert.notEmptyString(1)).toThrow(AssertionError);
  });
});

describe('number', () => {
  it('passes for numbers', () => {
    expect(() => assert.number(0)).not.toThrow();
    expect(() => assert.number(-1.5)).not.toThrow();
  });

  it('throws for non-numbers', () => {
    expect(() => assert.number('1')).toThrow(AssertionError);
    expect(() => assert.number(null)).toThrow(AssertionError);
  });
});

describe('bigint', () => {
  it('passes for bigints', () => {
    expect(() => assert.bigint(1n)).not.toThrow();
  });

  it('throws for non-bigints', () => {
    expect(() => assert.bigint(1)).toThrow(AssertionError);
  });
});

describe('date', () => {
  it('passes for Date instances', () => {
    expect(() => assert.date(new Date())).not.toThrow();
  });

  it('throws for non-dates', () => {
    expect(() => assert.date(Date.now())).toThrow(AssertionError);
    expect(() => assert.date('2020-01-01')).toThrow(AssertionError);
  });
});

describe('fn', () => {
  it('passes for functions', () => {
    expect(() => assert.fn(() => {})).not.toThrow();
    expect(() => assert.fn(function () {})).not.toThrow();
  });

  it('throws for non-functions', () => {
    expect(() => assert.fn({})).toThrow(AssertionError);
  });
});

describe('greaterThan', () => {
  it('passes when value is strictly greater than target', () => {
    expect(() => assert.greaterThan(5, 3)).not.toThrow();
  });

  it('throws when value is equal to or less than target', () => {
    expect(() => assert.greaterThan(3, 3)).toThrow(AssertionError);
    expect(() => assert.greaterThan(2, 3)).toThrow(AssertionError);
  });

  it('throws for non-numbers', () => {
    expect(() => assert.greaterThan('5', 3)).toThrow(AssertionError);
  });
});

describe('lessThan', () => {
  it('passes when value is less than or equal to target', () => {
    expect(() => assert.lessThan(2, 3)).not.toThrow();
    expect(() => assert.lessThan(3, 3)).not.toThrow();
  });

  it('throws when value is greater than target', () => {
    expect(() => assert.lessThan(4, 3)).toThrow(AssertionError);
  });

  it('throws for non-numbers', () => {
    expect(() => assert.lessThan('2', 3)).toThrow(AssertionError);
  });
});

describe('array', () => {
  it('passes for arrays', () => {
    expect(() => assert.array([])).not.toThrow();
    expect(() => assert.array([1, 'x'])).not.toThrow();
  });

  it('throws for non-arrays', () => {
    expect(() => assert.array({})).toThrow(AssertionError);
    expect(() => assert.array('x')).toThrow(AssertionError);
  });
});

describe('arrayStrings', () => {
  it('passes for arrays of strings (including empty)', () => {
    expect(() => assert.arrayStrings([])).not.toThrow();
    expect(() => assert.arrayStrings(['a', 'b'])).not.toThrow();
  });

  it('throws when any element is not a string', () => {
    expect(() => assert.arrayStrings(['a', 1])).toThrow(AssertionError);
    expect(() => assert.arrayStrings('a')).toThrow(AssertionError);
  });
});

describe('arrayNumbers', () => {
  it('passes for arrays of numbers (including empty)', () => {
    expect(() => assert.arrayNumbers([])).not.toThrow();
    expect(() => assert.arrayNumbers([1, 2])).not.toThrow();
  });

  it('throws when any element is not a number', () => {
    expect(() => assert.arrayNumbers([1, '2'])).toThrow(AssertionError);
    expect(() => assert.arrayNumbers(1)).toThrow(AssertionError);
  });
});

describe('execSuccess', () => {
  it('passes for a success result', () => {
    expect(() =>
      assert.execSuccess({ success: true, code: 'OK' }),
    ).not.toThrow();
  });

  it('throws for a skip result', () => {
    expect(() => assert.execSuccess({ skip: true, code: 'SKIP' })).toThrow(
      AssertionError,
    );
  });

  it('throws for values that are neither success nor skip', () => {
    expect(() => assert.execSuccess({})).toThrow(AssertionError);
    expect(() => assert.execSuccess(null)).toThrow(AssertionError);
  });
});

describe('execSkip', () => {
  it('passes for a skip result', () => {
    expect(() => assert.execSkip({ skip: true, code: 'SKIP' })).not.toThrow();
  });

  it('throws for a success result', () => {
    expect(() => assert.execSkip({ success: true, code: 'OK' })).toThrow(
      AssertionError,
    );
  });

  it('throws for values that are neither success nor skip', () => {
    expect(() => assert.execSkip({})).toThrow(AssertionError);
    expect(() => assert.execSkip(null)).toThrow(AssertionError);
  });
});

describe('AssertionError shape', () => {
  it('carries the ERR_ASSERTION code and the failing value', () => {
    try {
      assert.number('nope');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AssertionError);
      expect((error as AssertionError).code).toBe('ERR_ASSERTION');
      expect((error as AssertionError).operator).toBe('number');
      expect((error as AssertionError).actual).toBe('nope');
    }
  });
});
