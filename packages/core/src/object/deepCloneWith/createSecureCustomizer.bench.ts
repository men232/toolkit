import { bench, describe } from 'vitest';
import { createSecureCustomizer } from './createSecureCustomizer';
import { deepCloneWith } from './deepCloneWith';

/** The production logger key list, as of the FP-192 redaction work. */
export const LOGGER_KEYS = [
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

function records(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `user-${i}`,
    createdAt: 1700000000000 + i,
    meta: { plan: 'pro', flags: ['a', 'b'], score: i % 100 },
    password: 'hunter2',
  }));
}

/** A single chain `root.x.x.x…` of `depth` levels, `leaves` primitives per level. */
function chain(depth: number, leafKey: string, leaves = 8) {
  const root: Record<string, unknown> = {};
  let cursor = root;

  for (let level = 0; level < depth; level++) {
    const node: Record<string, unknown> = {};

    for (let l = 0; l < leaves; l++) node[`${leafKey}${l}`] = l;

    node[leafKey] = level;
    cursor.x = node;
    cursor = node;
  }

  return root;
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

const plain = createSecureCustomizer(['password']);
const logger = createSecureCustomizer(LOGGER_KEYS);
const trailing = createSecureCustomizer(['body.**']);
const middle = createSecureCustomizer(['body.**.code']);
const star = createSecureCustomizer(['items.*.token']);

describe('wide payload, 3k records', () => {
  const payload = records(3000);

  bench('noop', () => void deepCloneWith(payload, noop));
  bench('plain [password]', () => void deepCloneWith(payload, plain));
  bench('logger keys (29)', () => void deepCloneWith(payload, logger));
  bench('body.** (anchor absent)', () => void deepCloneWith(payload, trailing));
  bench(
    'items.*.token (anchor absent)',
    () => void deepCloneWith(payload, star),
  );
});

describe('deep chain, depth 1000', () => {
  const noCandidates = chain(1000, 'leaf');
  const allCandidates = chain(1000, 'code');

  bench('noop', () => void deepCloneWith(noCandidates, noop));
  bench('plain [password]', () => void deepCloneWith(noCandidates, plain));
  bench(
    'body.**.code, no code leaves',
    () => void deepCloneWith(noCandidates, middle),
  );
  bench(
    'body.**.code, code leaf on every level',
    () => void deepCloneWith(allCandidates, middle),
  );
  bench(
    'body.** (anchor absent)',
    () => void deepCloneWith(noCandidates, trailing),
  );
});

describe('request payload, 500 items', () => {
  const payload = request(500);

  bench('noop', () => void deepCloneWith(payload, noop));
  bench('logger keys (29)', () => void deepCloneWith(payload, logger));
  bench('body.**.code', () => void deepCloneWith(payload, middle));
});

describe('arrays, 100k ints', () => {
  const ints = Array.from({ length: 100_000 }, (_, i) => i);
  const indexed = createSecureCustomizer(['items.0.x']);

  bench('noop', () => void deepCloneWith(ints, noop));
  bench(
    'plain [password] (no index patterns)',
    () => void deepCloneWith(ints, plain),
  );
  bench(
    'items.0.x (index pattern present)',
    () => void deepCloneWith(ints, indexed),
  );
});

describe('creation', () => {
  bench(
    'createSecureCustomizer(logger keys)',
    () => void createSecureCustomizer(LOGGER_KEYS),
  );
  bench(
    'createSecureCustomizer([password])',
    () => void createSecureCustomizer(['password']),
  );
});
