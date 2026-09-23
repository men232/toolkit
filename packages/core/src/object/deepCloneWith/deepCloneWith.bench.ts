/**
 * Performance reference for the clone itself. Every group pairs a bare
 * `noop` customizer with the production secure customizer over the same
 * payload; `deepClone` is the floor without any customizer at all.
 */
import { bench, describe } from 'vitest';
import { deepClone } from '../deepClone/deepClone';
import { createSecureCustomizer } from './createSecureCustomizer';
import { deepCloneWith } from './deepCloneWith';

const LOGGER_KEYS = [
  'email',
  'password',
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'apikey',
  'x-api-key',
  'x-auth-token',
  'service_api_key',
  'access_token',
  'refresh_token',
  'token',
  'secret',
  'private_key',
  'accessToken',
  'refreshToken',
  'authToken',
  'currentPassword',
  'newPassword',
  'oldPassword',
  'clientSecret',
  'privateKey',
  'body.**.code',
  'body.**.key',
  'body.**.otp',
  'query.**.code',
  'query.**.key',
  'params.**.key',
];

const noop = () => undefined;
const logger = createSecureCustomizer(LOGGER_KEYS);

/** A typical log line: small, camelCase keys, a few secrets. */
function logLine(i: number) {
  return {
    requestId: `r-${i}`,
    userId: i,
    statusCode: 200,
    durationMs: 12,
    createdAt: 1700000000000,
    Authorization: 'Bearer x',
    accessToken: 'abc',
    body: { otp: { code: '1' }, userName: 'bob' },
    headers: { 'Content-Type': 'json', 'X-Api-Key': 'k' },
  };
}

function records(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `user-${i}`,
    createdAt: 1700000000000 + i,
    meta: { plan: 'pro', flags: ['a', 'b'], score: i % 100 },
    password: 'hunter2',
  }));
}

function request(items: number) {
  return {
    req: {
      id: 'req-1',
      method: 'POST',
      url: '/v1/auth/loginByPhone',
      headers: { 'content-type': 'application/json', 'user-agent': 'bench' },
      body: {
        phone: '+10000000000',
        otp: { code: '123456', key: 'k' },
        items: Array.from({ length: items }, (_, i) => ({
          id: i,
          token: 't',
          nested: { a: { b: { code: 'x', keep: i } } },
        })),
      },
      query: { code: 'q', page: 1 },
      params: { key: 'p', id: 5 },
    },
    res: { statusCode: 200, headers: { 'content-type': 'application/json' } },
    user: { id: 1, email: 'a@b.c', roles: ['admin'] },
  };
}

function mixed() {
  return {
    when: new Date(0),
    re: /x/g,
    map: new Map([['k', { v: 1 }]]),
    set: new Set([1, 2]),
    bytes: new Uint8Array(16),
    err: Object.assign(new Error('e'), { code: 'E' }),
    nested: { list: [{ a: 1 }, { b: 2 }] },
  };
}

for (const [name, payload] of [
  ['log line', logLine(1)],
  ['wide 3k records', records(3000)],
  ['request 500 items', request(500)],
  ['mixed built-ins', mixed()],
] as const) {
  describe(name, () => {
    bench('deepClone', () => void deepClone(payload));
    bench('deepCloneWith noop', () => void deepCloneWith(payload, noop));
    bench(
      'deepCloneWith logger keys',
      () => void deepCloneWith(payload, logger),
    );
  });
}
