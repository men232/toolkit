import type { EnvTarget } from './createEnvParser';

/**
 * Returns the environment variables source of the current runtime.
 *
 * Target: `process.env`
 *
 * Fallback: `import.meta.env`, then an empty object so that every read
 * yields its default instead of throwing.
 *
 * @example
 * const env = createEnvParser(getEnvTarget());
 *
 * @group Environment
 */
export function getEnvTarget(): EnvTarget {
  return (globalThis as any).process?.env ?? (import.meta as any).env ?? {};
}
