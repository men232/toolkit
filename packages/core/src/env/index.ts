import { logger } from '@/logger';
import { createEnvParser } from './createEnvParser';
import { getEnvTarget } from './getEnvTarget';

export * from './createEnvParser';

/**
 * Ready-to-use environment parser.
 *
 * Target: `process.env`
 *
 * Fallback: `import.meta.env`
 *
 * @example
 *
 * // env.string
 * const API_KEY = env.string('API_KEY', 'test_key');
 *
 * // env.bool
 * const TEST_FEATURE = env.bool('TEST_FEATURE', false);
 *
 * // env.int
 * const RETRY_ATTEMPTS = env.int('RETRY_ATTEMPTS', 5);
 *
 * // env.decimal
 * const DELAY_SECONDS = env.decimal('DELAY_SECONDS', 2, 5); // round to 2 digits
 *
 * // env.list
 * const TARGET_ROLES = env.list('TARGET_ROLES', 'string', ['ADMIN']);
 *
 * // env.json
 * const GOOGLE_CREDS = env.json<{ projectId: string; token: string; }>('GOOGLE_CREDS');
 *
 * // env.oneOf
 * const LOG_LEVEL = env.oneOf('LOG_LEVEL', ['debug', 'info', 'warn'], 'info');
 *
 * // env.parse
 * const DATABASE_URL = env.parse('DATABASE_URL', value => new URL(value));
 *
 * @replaces `parseInt(process.env.PORT || '3000')` / `Number(process.env.X)` — `parseInt` accepts `'3000abc'`
 * and both give `NaN` on garbage; `env.int` trims, rejects partial and unsafe integers, and falls back to the
 * default with a warning. Note it uses `Number` rules, so `'0x10'` → 16 and `'1e3'` → 1000.
 * @detect `(parseInt|parseFloat|Number)\(\s*process\.env(\.\w+|\[['"]\w+['"]\])`
 * @detect `[=(,:]\s*\+process\.env\.\w+`
 * @replaces `process.env.DEBUG === 'true'` — `env.bool` trims and falls back to the default for a missing or empty
 * value. Caveat: only exact `'true'`/`'false'` parse; `'TRUE'` and `'1'` give the default.
 * @detect `process\.env(\.\w+|\[['"]\w+['"]\])\s*[!=]==?\s*['"](true|false|1|0)['"]`
 * @replaces `JSON.parse(process.env.X)` — throws on a missing or malformed value; `env.json` returns the default
 * (`null`) with a warning and also parses EJSON.
 * @detect `JSON\.parse\(\s*process\.env`
 * @replaces `process.env.X?.split(',')` — keeps whitespace and empty items; `env.list` trims, drops empty items
 * and parses each item as `string`, `int`, `decimal`, `bool`, one of a list, or with a custom parser.
 * @detect `process\.env(\.\w+|\[['"]\w+['"]\])\??\.split\(`
 *
 * @group Environment
 */
export const env = createEnvParser(getEnvTarget(), { logger: logger('env') });
