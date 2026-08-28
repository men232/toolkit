import { afterEach, describe, expect, expectTypeOf, test, vi } from 'vitest';
import { runWithContext, withContext } from '../index';
import { createContext } from './createContext';

interface User {
  id: number;
  name: string;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createContext', () => {
  test('provides and injects a value within the same scope', () => {
    const [injectUser, provideUser] = createContext<User>('withUser');
    const user: User = { id: 1, name: 'Andrew' };

    const result = runWithContext(() => {
      provideUser(user);
      return injectUser();
    });

    expect(result).toBe(user);
  });

  test('provideContext returns the provided value', () => {
    const [, provideUser] = createContext<User>('withUser');
    const user: User = { id: 1, name: 'Andrew' };

    const result = runWithContext(() => provideUser(user));

    expect(result).toBe(user);
  });

  test('injects a value provided by a parent scope', () => {
    const [injectUser, provideUser] = createContext<User>('withUser');
    const user: User = { id: 1, name: 'Andrew' };

    const child = withContext(() => injectUser());

    const result = runWithContext(() => {
      provideUser(user);
      return child();
    });

    expect(result).toBe(user);
  });

  test('injects the nearest provided value', () => {
    const [injectValue, provideValue] = createContext<number>('withValue');

    const child = withContext(() => {
      provideValue(2);
      return injectValue();
    });

    const result = runWithContext(() => {
      provideValue(1);
      return [child(), injectValue()];
    });

    expect(result).toStrictEqual([2, 1]);
  });

  test('does not leak a child provided value into the parent scope', () => {
    const [injectValue, provideValue] = createContext<number>('withValue');

    const child = withContext(() => provideValue(2));

    expect(() =>
      runWithContext(() => {
        child();
        return injectValue();
      }),
    ).toThrow('not found');
  });

  test('detached scope does not see the parent provided value', () => {
    const [injectValue, provideValue] = createContext<number>('withValue');

    const child = withContext(() => injectValue(), true);

    expect(() =>
      runWithContext(() => {
        provideValue(1);
        return child();
      }),
    ).toThrow('not found');
  });

  test('keeps the value across async boundaries', () => {
    const [injectUser, provideUser] = createContext<User>('withUser');
    const user: User = { id: 1, name: 'Andrew' };

    const level2 = () => wait(10).then(() => injectUser());

    return runWithContext(() => {
      provideUser(user);

      return wait(10)
        .then(() => level2())
        .then(injected => {
          expect(injected).toBe(user);
        });
    });
  });

  test('contexts created with the same name stay independent', () => {
    const [injectA, provideA] = createContext<number>('withValue');
    const [injectB, provideB] = createContext<number>('withValue');

    const result = runWithContext(() => {
      provideA(1);
      provideB(2);
      return [injectA(), injectB()];
    });

    expect(result).toStrictEqual([1, 2]);
  });
});

describe('createContext / fallback', () => {
  test('returns the fallback when nothing was provided', () => {
    const [injectValue] = createContext<number>('withValue');

    expect(runWithContext(() => injectValue(42))).toBe(42);
  });

  test('calls a fallback factory only when nothing was provided', () => {
    const [injectValue, provideValue] = createContext<number>('withValue');
    const factory = vi.fn(() => 42);

    expect(runWithContext(() => injectValue(factory))).toBe(42);
    expect(factory).toHaveBeenCalledTimes(1);

    const result = runWithContext(() => {
      provideValue(1);
      return injectValue(factory);
    });

    expect(result).toBe(1);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test('returns null instead of throwing when null is the fallback', () => {
    const [injectValue] = createContext<number>('withValue');

    expect(runWithContext(() => injectValue(null))).toBeNull();
  });

  test('prefers the provided value over the fallback', () => {
    const [injectValue, provideValue] = createContext<number>('withValue');

    const result = runWithContext(() => {
      provideValue(1);
      return injectValue(42);
    });

    expect(result).toBe(1);
  });
});

describe('createContext / missing provider', () => {
  test('throws with the provider name and the injection key', () => {
    const [injectUser] = createContext<User>('withUser');

    expect(() => runWithContext(() => injectUser())).toThrow(
      'Injection `Symbol(withUserContext)` not found. Must be used within `withUser`',
    );
  });

  test('lists every provider name when several are given', () => {
    const [injectUser] = createContext<User>(['withUser', 'withSession']);

    expect(() => runWithContext(() => injectUser())).toThrow(
      'Must be used within one of the following providers: withUser, withSession',
    );
  });

  test('uses the explicit context name for the injection key', () => {
    const [injectUser] = createContext<User>('withUser', 'user');

    expect(() => runWithContext(() => injectUser())).toThrow(
      'Injection `Symbol(user)` not found',
    );
  });

  test('leaves the injection key undescribed for an array of names without a context name', () => {
    const [injectUser] = createContext<User>(['withUser', 'withSession']);

    expect(() => runWithContext(() => injectUser())).toThrow(
      'Injection `Symbol()` not found',
    );
  });

  test('throws outside of any injection context', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const [injectUser] = createContext<User>('withUser');

    expect(() => injectUser()).toThrow('not found');
    expect(warn).toHaveBeenCalled();
  });

  test('throws when the value was provided outside of any injection context', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const [injectUser, provideUser] = createContext<User>('withUser');

    provideUser({ id: 1, name: 'Andrew' });

    expect(() => runWithContext(() => injectUser())).toThrow('not found');
    expect(warn).toHaveBeenCalled();
  });

  test.each([[0], [''], [false], [Number.NaN]])(
    'treats the provided falsy value %j as expected',
    value => {
      const [injectValue, provideValue] = createContext<unknown>('withValue');

      expect(
        runWithContext(() => {
          provideValue(value);
          return injectValue();
        }),
      ).toBe(value);
    },
  );
});

describe('createContext / types', () => {
  test('infers the context value type', () => {
    const [injectUser, provideUser] = createContext<User>('withUser');

    runWithContext(() => {
      provideUser({ id: 1, name: 'Andrew' });

      expectTypeOf(injectUser()).toEqualTypeOf<User>();
      expectTypeOf(
        injectUser({ id: 2, name: 'Fallback' }),
      ).toEqualTypeOf<User>();
      expectTypeOf(
        injectUser(() => ({ id: 2, name: 'Fallback' })),
      ).toEqualTypeOf<User>();
      expectTypeOf(injectUser(null)).toEqualTypeOf<User | null>();
      expectTypeOf(provideUser).parameter(0).toEqualTypeOf<User>();
    });
  });
});
