import { realpathSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolve a path through filesystem links, falling back to the plain absolute
 * form when it does not exist.
 *
 * The fallback is what makes this usable for comparison: a missing or
 * synthetic module id still maps to one deterministic string, so two spellings
 * of the same nonexistent path still compare equal.
 */
export function resolvePhysicalPath(value: string): string {
  const resolved = path.resolve(value);

  try {
    return realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}
