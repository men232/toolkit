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
 * @group Environment
 */
export const env = createEnvParser(getEnvTarget(), { logger: logger('env') });
