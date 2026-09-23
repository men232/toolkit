import { describe, expect, it } from 'vitest';
import { createSecureCustomizer } from './createSecureCustomizer';
import { deepCloneWith } from './deepCloneWith';

const SECURE = '<** secure **>';
const CIRCULAR = '<** circular **>';

describe('createSecureCustomizer', () => {
  it('redacts a matching top-level string property', () => {
    const customizer = createSecureCustomizer(['password']);
    const result = deepCloneWith(
      { password: 'secret', name: 'Alice' },
      customizer,
    );
    expect(result).toEqual({ password: SECURE, name: 'Alice' });
  });

  it('redacts matching properties regardless of key casing', () => {
    const customizer = createSecureCustomizer(['token']);
    const result = deepCloneWith(
      { TOKEN: 'abc', Token: 'def', token: 'ghi' },
      customizer,
    );
    expect(result).toEqual({ TOKEN: SECURE, Token: SECURE, token: SECURE });
  });

  it('redacts properties case-insensitively against the properties list', () => {
    const customizer = createSecureCustomizer(['PASSWORD']);
    const result = deepCloneWith({ password: 'secret' }, customizer);
    expect(result).toEqual({ password: SECURE });
  });

  it('does not redact non-matching properties', () => {
    const customizer = createSecureCustomizer(['secret']);
    const result = deepCloneWith({ name: 'Alice', age: 30 }, customizer);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('redacts matching properties in nested objects', () => {
    const customizer = createSecureCustomizer(['apiKey']);
    const result = deepCloneWith(
      { user: { apiKey: 'key-123', name: 'Bob' } },
      customizer,
    );
    expect(result).toEqual({ user: { apiKey: SECURE, name: 'Bob' } });
  });

  it('redacts multiple fields', () => {
    const customizer = createSecureCustomizer(['password', 'token']);
    const result = deepCloneWith(
      { password: 'p', token: 't', email: 'e@e.com' },
      customizer,
    );
    expect(result).toEqual({
      password: SECURE,
      token: SECURE,
      email: 'e@e.com',
    });
  });

  it('redacts non-string primitives when the key matches', () => {
    const customizer = createSecureCustomizer(['count']);
    const result = deepCloneWith({ count: 42 }, customizer);
    expect(result).toEqual({ count: SECURE });
  });

  it('does not modify the original object', () => {
    const customizer = createSecureCustomizer(['password']);
    const original = { password: 'secret' };
    deepCloneWith(original, customizer);
    expect(original.password).toBe('secret');
  });

  it('replaces circular references with circular label', () => {
    const customizer = createSecureCustomizer([]);
    const obj: any = { a: 1 };
    obj.self = obj;
    const result = deepCloneWith(obj, customizer);
    expect(result.self).toBe(CIRCULAR);
  });

  it('normalizes Error values by default', () => {
    const customizer = createSecureCustomizer([]);
    const err = new Error('oops');
    const result = deepCloneWith({ err }, customizer);
    expect(result.err).toEqual(
      expect.objectContaining({ message: 'oops', name: 'Error' }),
    );
    expect(result.err).not.toBeInstanceOf(Error);
  });

  it('preserves Error instances when normalizeError is false', () => {
    const customizer = createSecureCustomizer([], { normalizeError: false });
    const err = new Error('oops');
    const result = deepCloneWith({ err }, customizer);
    expect(result.err).toBeInstanceOf(Error);
  });

  it('normalizes nested Error cause', () => {
    const customizer = createSecureCustomizer([]);
    const cause = new Error('root cause');
    const err = new Error('wrapper', { cause });
    const result = deepCloneWith({ err }, customizer);
    expect(result.err.cause).toEqual(
      expect.objectContaining({ message: 'root cause' }),
    );
  });

  it('exposes the labels it substitutes on the factory', () => {
    const customizer = createSecureCustomizer([]);
    expect(customizer.labelSecure).toBe(SECURE);
    expect(customizer.labelCircular).toBe(CIRCULAR);
  });

  it('exposes custom labels on the factory', () => {
    const customizer = createSecureCustomizer([], {
      labelSecure: '[redacted]',
      labelCircular: '[circular]',
    });
    expect(customizer.labelSecure).toBe('[redacted]');
    expect(customizer.labelCircular).toBe('[circular]');
  });

  it('applies labelSecure to redacted properties at any depth', () => {
    const customizer = createSecureCustomizer(['password', 'token'], {
      labelSecure: '[redacted]',
    });
    const result = deepCloneWith(
      {
        password: 'p',
        nested: { token: { value: 't' } },
        list: [{ password: 1 }],
      },
      customizer,
    );
    expect(result).toEqual({
      password: '[redacted]',
      nested: { token: '[redacted]' },
      list: [{ password: '[redacted]' }],
    });
  });

  it('applies labelSecure inside a normalised Error cause', () => {
    const customizer = createSecureCustomizer(['password'], {
      labelSecure: '[redacted]',
    });
    const result = deepCloneWith(
      { err: new Error('x', { cause: { password: 'p' } }) },
      customizer,
    );
    expect(result.err.cause).toEqual({ password: '[redacted]' });
  });

  it('applies labelCircular to circular references', () => {
    const customizer = createSecureCustomizer([], {
      labelCircular: '[circular]',
    });
    const input: any = { child: { items: [] } };
    input.self = input;
    input.child.items.push(input.child);
    const result = deepCloneWith(input, customizer);
    expect(result.self).toBe('[circular]');
    expect(result.child.items).toEqual(['[circular]']);
  });

  it('applies labelCircular to a cycle through a normalised Error', () => {
    const customizer = createSecureCustomizer([], {
      labelCircular: '[circular]',
    });
    const err: any = new Error('x');
    err.cause = { err };
    const result = deepCloneWith({ err }, customizer);
    expect(result.err.cause).toEqual({ err: '[circular]' });
  });

  it('calls a labelSecure function with the value and key', () => {
    const customizer = createSecureCustomizer(['token', 'email'], {
      labelSecure: (value, key) =>
        key === 'email'
          ? String(value).replace(/^(.).*(@.*)$/, '$1***$2')
          : `…${String(value).slice(-4)}`,
    });
    const result = deepCloneWith(
      { token: 'abcd1234', user: { email: 'alice@mail.com' } },
      customizer,
    );
    expect(result).toEqual({
      token: '…1234',
      user: { email: 'a***@mail.com' },
    });
  });

  it('passes the raw value to a labelSecure function', () => {
    const seen: unknown[] = [];
    const customizer = createSecureCustomizer(['token'], {
      labelSecure: value => {
        seen.push(value);
        return 'x';
      },
    });
    const token = { value: 't' };
    deepCloneWith({ token, n: { token: 42 } }, customizer);
    expect(seen).toEqual([token, 42]);
    expect(seen[0]).toBe(token);
  });

  it('gives a labelSecure function a lazy path from the root', () => {
    const paths: PropertyKey[][] = [];
    const customizer = createSecureCustomizer(['token'], {
      labelSecure: (_value, _key, getPath) => {
        paths.push(getPath());
        return 'x';
      },
    });
    const sym = Symbol('s');
    deepCloneWith(
      {
        token: 1,
        items: [{ token: 2 }],
        m: new Map([['k', { token: 3 }]]),
        s: new Set([{ token: 4 }]),
        [sym]: { token: 5 },
      },
      customizer,
    );
    expect(paths).toEqual([
      ['token'],
      ['items', 0, 'token'],
      ['m', 'k', 'token'],
      ['s', 'token'],
      [sym, 'token'],
    ]);
  });

  it('does not build the path unless getPath is called', () => {
    const calls: number[] = [];
    const customizer = createSecureCustomizer(['token'], {
      labelSecure: (_value, _key, getPath) => {
        calls.push(getPath.length);
        return 'x';
      },
    });
    const result = deepCloneWith({ a: { token: 1 } }, customizer);
    expect(result).toEqual({ a: { token: 'x' } });
    expect(calls).toEqual([0]);
  });

  it('falls back to the default label when a labelSecure function returns undefined', () => {
    const customizer = createSecureCustomizer(['token'], {
      labelSecure: () => undefined,
    });
    const result = deepCloneWith({ token: 'secret' }, customizer);
    expect(result.token).toBe(SECURE);
  });

  it('uses a labelSecure function inside a normalised Error cause', () => {
    const customizer = createSecureCustomizer(['token'], {
      labelSecure: (_v, _k, getPath) => getPath().join('.'),
    });
    const result = deepCloneWith(
      { err: new Error('x', { cause: { token: 't' } }) },
      customizer,
    );
    expect(result.err.cause).toEqual({ token: 'err.cause.token' });
  });

  it('matches path patterns through a normalised Error cause', () => {
    const customizer = createSecureCustomizer([
      'body.**.token',
      'wrapped.cause',
    ]);
    const result = deepCloneWith(
      {
        body: { err: new Error('x', { cause: { token: 't' } }) },
        wrapped: new Error('y', { cause: { token: 'kept' } }),
        other: new Error('z', { cause: { token: 'kept' } }),
      },
      customizer,
    );
    expect(result.body.err.cause).toEqual({ token: SECURE });
    expect(result.wrapped.cause).toBe(SECURE);
    expect(result.other.cause).toEqual({ token: 'kept' });
  });

  it('exposes a labelSecure function on the factory', () => {
    const labelSecure = () => 'x';
    const customizer = createSecureCustomizer([], { labelSecure });
    expect(customizer.labelSecure).toBe(labelSecure);
  });

  it('keeps the default label for the one not overridden', () => {
    const input: any = { password: 'p' };
    input.self = input;

    const secureOnly = deepCloneWith(
      input,
      createSecureCustomizer(['password'], { labelSecure: '[redacted]' }),
    );
    expect(secureOnly.password).toBe('[redacted]');
    expect(secureOnly.self).toBe(CIRCULAR);

    const circularOnly = deepCloneWith(
      input,
      createSecureCustomizer(['password'], { labelCircular: '[circular]' }),
    );
    expect(circularOnly.password).toBe(SECURE);
    expect(circularOnly.self).toBe('[circular]');
  });

  it('redacts an object value whole when its key matches', () => {
    const customizer = createSecureCustomizer(['token']);
    const result = deepCloneWith(
      { token: { value: 'abc', expiresAt: 123 }, user: { id: 1 } },
      customizer,
    );
    expect(result).toEqual({ token: SECURE, user: { id: 1 } });
  });

  it('redacts an array value whole when its key matches', () => {
    const customizer = createSecureCustomizer(['password']);
    const result = deepCloneWith({ password: ['a', 'b'] }, customizer);
    expect(result).toEqual({ password: SECURE });
  });

  it('matches a dotted path only under the named parent', () => {
    const customizer = createSecureCustomizer(['otp.code']);
    const result = deepCloneWith(
      { otp: { code: '1234', ttl: 60 }, code: 'EN', promo: { code: 'X' } },
      customizer,
    );
    expect(result).toEqual({
      otp: { code: SECURE, ttl: 60 },
      code: 'EN',
      promo: { code: 'X' },
    });
  });

  it('matches a dotted path as a suffix at any depth', () => {
    const customizer = createSecureCustomizer(['otp.code']);
    const result = deepCloneWith(
      { body: { otp: { code: '1234' } } },
      customizer,
    );
    expect(result).toEqual({ body: { otp: { code: SECURE } } });
  });

  it('matches a path segment wildcard against any key including array indexes', () => {
    const customizer = createSecureCustomizer(['items.*.token', 'otp.*']);
    const result = deepCloneWith(
      {
        items: [
          { token: 't1', id: 1 },
          { token: 't2', id: 2 },
        ],
        token: 'root',
        otp: { code: '1', key: 'k' },
      },
      customizer,
    );
    expect(result).toEqual({
      items: [
        { token: SECURE, id: 1 },
        { token: SECURE, id: 2 },
      ],
      token: 'root',
      otp: { code: SECURE, key: SECURE },
    });
  });

  it('matches a deep wildcard against zero or more segments', () => {
    const customizer = createSecureCustomizer(['body.**.code']);
    const result = deepCloneWith(
      {
        body: { code: '1', otp: { code: '2' }, a: { b: { code: '3' } } },
        code: 'root',
        locale: { code: 'en' },
      },
      customizer,
    );
    expect(result).toEqual({
      body: { code: SECURE, otp: { code: SECURE }, a: { b: { code: SECURE } } },
      code: 'root',
      locale: { code: 'en' },
    });
  });

  it('treats a leading deep wildcard like a plain key', () => {
    const customizer = createSecureCustomizer(['**.code']);
    const result = deepCloneWith(
      { code: '1', a: { code: '2', b: { code: '3' } }, other: 'x' },
      customizer,
    );
    expect(result).toEqual({
      code: SECURE,
      a: { code: SECURE, b: { code: SECURE } },
      other: 'x',
    });
  });

  it('redacts every property below a trailing deep wildcard', () => {
    const customizer = createSecureCustomizer(['body.**']);
    const result = deepCloneWith(
      { body: { a: 1, b: { c: 2 } }, other: { a: 3 } },
      customizer,
    );
    expect(result).toEqual({
      body: { a: SECURE, b: SECURE },
      other: { a: 3 },
    });
  });

  it('backtracks a deep wildcard to find an outer anchor', () => {
    const customizer = createSecureCustomizer(['a.**.b.c']);
    const result = deepCloneWith(
      { a: { b: { x: { b: { c: '1' } } } }, b: { c: '2' } },
      customizer,
    );
    expect(result).toEqual({
      a: { b: { x: { b: { c: SECURE } } } },
      b: { c: '2' },
    });
  });

  it('matches dotted paths case-insensitively', () => {
    const customizer = createSecureCustomizer(['Otp.Code']);
    const result = deepCloneWith({ OTP: { code: '1' } }, customizer);
    expect(result).toEqual({ OTP: { code: SECURE } });
  });

  it('matches a symbol property by identity', () => {
    const sym = Symbol('secret');
    const customizer = createSecureCustomizer([sym]);
    const result = deepCloneWith(
      { [sym]: 'x', other: Symbol('y') },
      customizer,
    );
    expect(result[sym]).toBe(SECURE);
    expect(typeof result.other).toBe('symbol');
  });

  it('does not coerce Map keys that are objects', () => {
    const customizer = createSecureCustomizer(['password']);
    const objectKey = Object.create(null);
    const result = deepCloneWith(
      { m: new Map<unknown, unknown>([[objectKey, { password: 'p' }]]) },
      customizer,
    );
    expect(result.m.get(objectKey)).toEqual({ password: SECURE });
  });

  it('clones and redacts the Error cause when normalizeError is false', () => {
    const customizer = createSecureCustomizer(['password'], {
      normalizeError: false,
    });
    const cause = { password: 'p', code: 'E' };
    const result = deepCloneWith(
      { err: new Error('x', { cause }) },
      customizer,
    );
    expect(result.err.cause).toEqual({ password: SECURE, code: 'E' });
    expect(result.err.cause).not.toBe(cause);
  });

  it('keeps a primitive Error cause when normalising', () => {
    const customizer = createSecureCustomizer([]);
    const result = deepCloneWith(
      { err: new Error('x', { cause: 'root' }) },
      customizer,
    );
    expect((result.err as any).cause).toBe('root');
  });

  it('clones and redacts a plain object Error cause when normalising', () => {
    const customizer = createSecureCustomizer(['password']);
    const result = deepCloneWith(
      { err: new Error('x', { cause: { code: 'E', password: 'p' } }) },
      customizer,
    );
    expect((result.err as any).cause).toEqual({ code: 'E', password: SECURE });
  });

  it('passes objects with an unknown Symbol.toStringTag through by reference', () => {
    // Such objects are not walked, so keys inside them are not redacted.
    class Headers {
      authorization = 'Bearer secret';
      get [Symbol.toStringTag]() {
        return 'AxiosHeaders';
      }
    }
    const headers = new Headers();
    const customizer = createSecureCustomizer(['authorization']);
    const result = deepCloneWith({ headers }, customizer);
    expect(result.headers).toBe(headers);
  });

  it('matches a trailing deep wildcard across a long chain', () => {
    const customizer = createSecureCustomizer(['body.**']);
    const depth = 300;
    const root: any = { body: {}, other: {} };
    let inBody = root.body;
    let outside = root.other;
    for (let i = 0; i < depth; i++) {
      inBody = inBody.next = { leaf: i };
      outside = outside.next = { leaf: i };
    }
    const result = deepCloneWith(root, customizer);
    expect(result.body.next).toBe(SECURE);
    let node = result.other;
    for (let i = 0; i < depth; i++) {
      node = node.next;
      expect(node.leaf).toBe(i);
    }
  });

  it('matches many ambiguous `**` patterns against a regex oracle', () => {
    const patterns = Array.from(
      { length: 20 },
      (_, i) => `a${i}.*.*.**.b${i}.*.c`,
    );
    const literals = [...new Set(patterns.flatMap(p => p.split('.')))].filter(
      s => s !== '*' && s !== '**',
    );

    // A pattern as a regex over the NUL-joined path, matched as a suffix on
    // segment boundaries.
    const regexes = patterns.map(p => {
      let body = '';
      let afterDeep = false;
      for (const s of p.split('.')) {
        if (body !== '' && !afterDeep) body += '\0';
        body += s === '**' ? '(?:[^\0]+\0)*' : s === '*' ? '[^\0]+' : s;
        afterDeep = s === '**';
      }
      return new RegExp(`(?:^|\0)${body}$`);
    });
    const secureByOracle = (path: string[]) => {
      const joined = path.join('\0');
      return regexes.some(r => r.test(joined));
    };
    const expected = (value: any, path: string[]): any => {
      if (typeof value !== 'object' || value === null) return value;
      const out: any = {};
      for (const k of Object.keys(value)) {
        const p = [...path, k];
        out[k] = secureByOracle(p) ? SECURE : expected(value[k], p);
      }
      return out;
    };

    const chain = (depth: number, seed: number) => {
      const root: any = {};
      let cursor = root;
      let x = seed;
      for (let i = 0; i < depth; i++) {
        x = (x * 1103515245 + 12345) & 0x7fffffff;
        cursor = cursor[literals[x % literals.length]] = { c: i, z: { c: i } };
      }
      return root;
    };

    const customizer = createSecureCustomizer(patterns);
    for (let seed = 0; seed < 60; seed++) {
      const payload = chain(120, seed);
      expect(deepCloneWith(payload, customizer)).toEqual(expected(payload, []));
    }
  });

  it('anchors a `$` pattern to the root', () => {
    const customizer = createSecureCustomizer(['$.headers.authorization']);
    const result = deepCloneWith(
      {
        headers: { authorization: 'top' },
        req: { headers: { authorization: 'nested' } },
        authorization: 'bare',
      },
      customizer,
    );
    expect(result).toEqual({
      headers: { authorization: SECURE },
      req: { headers: { authorization: 'nested' } },
      authorization: 'bare',
    });
  });

  it('anchors `$.*` to the top-level properties', () => {
    const customizer = createSecureCustomizer(['$.*']);
    const result = deepCloneWith({ a: 1, b: { c: 2 } }, customizer);
    expect(result).toEqual({ a: SECURE, b: SECURE });
  });

  it('anchors a `**` prefix to the root', () => {
    const customizer = createSecureCustomizer(['$.body.**.code']);
    const result = deepCloneWith(
      {
        body: { code: '1', otp: { code: '2' } },
        req: { body: { code: '3' } },
        code: '4',
      },
      customizer,
    );
    expect(result).toEqual({
      body: { code: SECURE, otp: { code: SECURE } },
      req: { body: { code: '3' } },
      code: '4',
    });
  });

  it('treats `$.**.key` as a plain key', () => {
    const customizer = createSecureCustomizer(['$.**.code']);
    const result = deepCloneWith(
      { code: '1', a: { b: { code: '2' } } },
      customizer,
    );
    expect(result).toEqual({ code: SECURE, a: { b: { code: SECURE } } });
  });

  it('does not confuse a literal `$` key with the anchor', () => {
    const customizer = createSecureCustomizer(['$.token']);
    const result = deepCloneWith({ token: 't', $: { token: 'u' } }, customizer);
    expect(result).toEqual({ token: SECURE, $: { token: 'u' } });
  });

  it('anchors through a root Set and Map', () => {
    const customizer = createSecureCustomizer(['$.token', '$.k.token']);
    const set = deepCloneWith(
      new Set([{ token: 't', n: { token: 'u' } }]),
      customizer,
    );
    expect([...set]).toEqual([{ token: SECURE, n: { token: 'u' } }]);

    const map = deepCloneWith(
      new Map([
        ['k', { token: 't' }],
        ['j', { token: 'u' }],
      ]),
      customizer,
    );
    expect([...map]).toEqual([
      ['k', { token: SECURE }],
      ['j', { token: 'u' }],
    ]);
  });

  it('anchors through a root Error', () => {
    const customizer = createSecureCustomizer(['$.cause.token']);
    const result = deepCloneWith(
      new Error('x', { cause: { token: 't', deep: { token: 'u' } } }),
      customizer,
    );
    expect(result.cause).toEqual({ token: SECURE, deep: { token: 'u' } });
  });

  it('keeps unanchored patterns matching at the root as well', () => {
    const customizer = createSecureCustomizer(['headers.authorization']);
    const result = deepCloneWith(
      {
        headers: { authorization: 'top' },
        req: { headers: { authorization: 'nested' } },
      },
      customizer,
    );
    expect(result).toEqual({
      headers: { authorization: SECURE },
      req: { headers: { authorization: SECURE } },
    });
  });

  it('rejects `$` anywhere but the start of a pattern', () => {
    expect(() => createSecureCustomizer(['a.$.b'])).toThrow(/\$/);
    expect(() => createSecureCustomizer(['$.$.b'])).toThrow(/\$/);
  });

  it('rejects a bare `$` pattern', () => {
    expect(() => createSecureCustomizer(['$'])).toThrow(/\$/);
    expect(() => createSecureCustomizer(['$.*'])).not.toThrow();
  });

  it('rejects a pattern with two `**`', () => {
    expect(() => createSecureCustomizer(['a.**.b.**.c'])).toThrow(/one/);
  });

  it('rejects more than 30 patterns with `**`', () => {
    const patterns = Array.from({ length: 31 }, (_, i) => `a${i}.**.b`);
    expect(() => createSecureCustomizer(patterns)).toThrow(/30/);
    expect(() => createSecureCustomizer(patterns.slice(1))).not.toThrow();
  });

  it('does not count plain keys and exact paths towards the `**` limit', () => {
    const patterns = [
      ...Array.from({ length: 200 }, (_, i) => `key${i}`),
      ...Array.from({ length: 200 }, (_, i) => `a${i}.b.c`),
      ...Array.from({ length: 30 }, (_, i) => `d${i}.**.e`),
    ];
    const customizer = createSecureCustomizer(patterns);
    const result = deepCloneWith(
      { key150: 1, a7: { b: { c: 2 } }, d29: { x: { e: 3 } }, keep: 4 },
      customizer,
    );
    expect(result).toEqual({
      key150: SECURE,
      a7: { b: { c: SECURE } },
      d29: { x: { e: SECURE } },
      keep: 4,
    });
  });

  it('matches `*` against exactly one segment', () => {
    const customizer = createSecureCustomizer(['otp.*.code']);
    const result = deepCloneWith(
      {
        zero: { otp: { code: '0' } },
        one: { otp: { a: { code: '1' } } },
        two: { otp: { a: { b: { code: '2' } } } },
      },
      customizer,
    );
    expect(result).toEqual({
      zero: { otp: { code: '0' } },
      one: { otp: { a: { code: SECURE } } },
      two: { otp: { a: { b: { code: '2' } } } },
    });
  });

  it('passes `**` through keyless Set members while `*` does not', () => {
    const items = () => new Set([{ token: 't', id: 1 }]);
    const [viaStar] = deepCloneWith(
      { items: items() },
      createSecureCustomizer(['items.*.token']),
    ).items;
    const [viaDeep] = deepCloneWith(
      { items: items() },
      createSecureCustomizer(['items.**.token']),
    ).items;
    const [viaPlain] = deepCloneWith(
      { items: items() },
      createSecureCustomizer(['token']),
    ).items;
    expect(viaStar).toEqual({ token: 't', id: 1 });
    expect(viaDeep).toEqual({ token: SECURE, id: 1 });
    expect(viaPlain).toEqual({ token: SECURE, id: 1 });
  });

  it('matches Map keys as path segments', () => {
    const customizer = createSecureCustomizer(['m.token']);
    const result = deepCloneWith(
      {
        m: new Map([
          ['token', 'x'],
          ['other', 'y'],
        ]),
        token: 'root',
      },
      customizer,
    );
    expect(result.m.get('token')).toBe(SECURE);
    expect(result.m.get('other')).toBe('y');
    expect(result.token).toBe('root');
  });

  it('matches a numeric segment against that array index only', () => {
    const customizer = createSecureCustomizer(['items.0.token']);
    const result = deepCloneWith(
      { items: [{ token: 'a' }, { token: 'b' }] },
      customizer,
    );
    expect(result).toEqual({ items: [{ token: SECURE }, { token: 'b' }] });
  });

  it('accepts a numeric property key in the list', () => {
    const customizer = createSecureCustomizer([0]);
    const result = deepCloneWith({ items: ['a', 'b'] }, customizer);
    expect(result).toEqual({ items: [SECURE, 'b'] });
  });

  it('reads a key containing a dot as a path, not as one literal key', () => {
    const customizer = createSecureCustomizer(['otp.code']);
    const result = deepCloneWith(
      { 'otp.code': 'literal', otp: { code: 'nested' } },
      customizer,
    );
    expect(result).toEqual({ 'otp.code': 'literal', otp: { code: SECURE } });
  });

  it('collapses consecutive deep wildcards', () => {
    const customizer = createSecureCustomizer(['a.**.**.b']);
    const result = deepCloneWith(
      { a: { b: '0', x: { b: '1' } }, b: 'root' },
      customizer,
    );
    expect(result).toEqual({ a: { b: SECURE, x: { b: SECURE } }, b: 'root' });
  });

  it('redacts Map, Set and Date values whole under a matching key', () => {
    const customizer = createSecureCustomizer(['token']);
    const result = deepCloneWith(
      {
        a: { token: new Map([['k', 'v']]) },
        b: { token: new Set(['v']) },
        c: { token: new Date(0) },
      },
      customizer,
    );
    expect(result).toEqual({
      a: { token: SECURE },
      b: { token: SECURE },
      c: { token: SECURE },
    });
  });

  it('does not descend into a redacted container', () => {
    const seen: PropertyKey[] = [];
    const spy = (_value: unknown, key: PropertyKey | undefined) => {
      if (key !== undefined) seen.push(key);
    };
    deepCloneWith({ token: { inner: { deeper: 1 } }, keep: { inner: 2 } }, [
      createSecureCustomizer(['token']),
      spy,
    ]);
    expect(seen).toEqual(['token', 'keep', 'inner']);
  });

  it('hands the label, not the secret, to later customizers in the chain', () => {
    const values: unknown[] = [];
    const spy = (value: unknown, key: PropertyKey | undefined) => {
      if (key === 'token') values.push(value);
    };
    deepCloneWith({ token: 'secret' }, [
      createSecureCustomizer(['token']),
      spy,
    ]);
    expect(values).toEqual([SECURE]);
  });

  it('does not let a redacted container poison the seen-set', () => {
    const shared = { v: 1 };
    const customizer = createSecureCustomizer(['token']);
    const result = deepCloneWith({ token: shared, other: shared }, customizer);
    expect(result).toEqual({ token: SECURE, other: { v: 1 } });
  });

  it('labels a repeated non-circular reference as circular', () => {
    // Deliberate: the seen-set tracks references, not ancestry. A perf
    // rewrite that switches to real ancestry tracking changes this output.
    const shared = { v: 1 };
    const customizer = createSecureCustomizer([]);
    const result = deepCloneWith({ a: shared, b: shared }, customizer);
    expect(result).toEqual({ a: { v: 1 }, b: CIRCULAR });
  });

  it('redacts secure keys among Error own properties when normalizeError is false', () => {
    const err = Object.assign(new Error('x'), { token: 't', code: 'E' });
    const customizer = createSecureCustomizer(['token'], {
      normalizeError: false,
    });
    const result = deepCloneWith({ err }, customizer);
    expect(result.err).toBeInstanceOf(Error);
    expect(result.err.token).toBe(SECURE);
    expect(result.err.code).toBe('E');
  });

  it('survives a cycle through the Error cause when normalising', () => {
    const err: any = new Error('x');
    err.cause = { err };
    const customizer = createSecureCustomizer([]);
    const result: any = deepCloneWith({ err }, customizer);
    expect(result.err.message).toBe('x');
    expect(result.err.cause.err).toBe(CIRCULAR);
  });

  it('redacts a candidate leaf on every level of a deep chain', () => {
    const customizer = createSecureCustomizer(['body.**.code']);
    const depth = 500;
    const root: any = { body: {} };
    let cursor = root.body;
    for (let i = 0; i < depth; i++) {
      cursor = cursor.next = { code: i, keep: i };
    }
    const result = deepCloneWith(root, customizer);
    let node = result.body;
    for (let i = 0; i < depth; i++) {
      node = node.next;
      expect(node.code).toBe(SECURE);
      expect(node.keep).toBe(i);
    }
  });

  it('each call creates an independent seen-set (factory reuse)', () => {
    const customizer = createSecureCustomizer([]);
    const obj: any = { a: 1 };
    obj.self = obj;
    const r1 = deepCloneWith(obj, customizer);
    const r2 = deepCloneWith(obj, customizer);
    expect(r1.self).toBe(CIRCULAR);
    expect(r2.self).toBe(CIRCULAR);
  });
});
