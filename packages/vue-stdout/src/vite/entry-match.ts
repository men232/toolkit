/**
 * Adapted from @vue-tui/vite -- `packages/vite/src/entry-match.ts`.
 *
 * MIT License. Copyright (c) 2026 Yunfei He.
 * Full notice: `packages/vue-stdout/THIRD-PARTY-NOTICES.md`.
 *
 * Changes from the original: the entry is a required plugin option here rather
 * than being derived from Vite's top-level `input`, so `devEntryFromViteInput`
 * is dropped; the UNC and Windows drive-letter arms of `resolveConfiguredEntry`
 * are dropped with them, because this package does not target Windows.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolvePhysicalPath } from './physical-path.ts';

/**
 * Put the configured entry into the rooted form the module runner imports.
 *
 * Anything already rooted -- a leading `/`, whether that means "relative to
 * the Vite root" or a real POSIX absolute path -- passes through untouched;
 * the ambiguity is Vite's own and {@link resolveConfiguredEntry} resolves it
 * the same way Vite does. Only the relative spellings (`playground/index.tsx`,
 * `./playground/index.tsx`) gain the slash.
 */
export function normalizeDevEntry(entry: string): string {
  const normalized = entry.replace(/\\/g, '/');
  if (normalized.startsWith('/')) return normalized;
  return `/${normalized.replace(/^(?:\.\/)+/, '')}`;
}

/**
 * Resolve the normalized entry to one absolute filesystem path, so a
 * transformed module id can be matched against it exactly.
 *
 * A leading slash is ambiguous by design in Vite: an existing absolute file
 * wins, and a missing one is read against the project root. Both arms are
 * here because getting the choice wrong silently skips the dev connector --
 * the app then runs with no HMR, and reports no error about it.
 */
export function resolveConfiguredEntry(root: string, entry: string): string {
  const normalizedRoot = path.resolve(root).replace(/\\/g, '/');
  const normalized = entry.replace(/\\/g, '/');

  // A true filesystem-absolute path under (or equal to) the Vite root.
  if (
    normalized === normalizedRoot ||
    normalized.startsWith(`${normalizedRoot}/`)
  ) {
    return path.resolve(normalized);
  }

  // Vite's resolver accepts an existing absolute file outside the root, and
  // its module runner imports the id it was given -- so matching has to make
  // the same choice rather than reinterpreting that file as root-relative.
  if (path.isAbsolute(normalized) && existsSync(normalized)) {
    return path.resolve(normalized);
  }

  return path.resolve(normalizedRoot, normalized.replace(/^\//, ''));
}

/** Drop Vite's query suffixes (`?vue&type=script`) before comparing paths. */
export function stripModuleIdQuery(id: string): string {
  const query = id.indexOf('?');
  return query === -1 ? id : id.slice(0, query);
}

/**
 * Exact match of a transformed module id against the resolved entry --
 * never a suffix match, which would inject the dev connector into any
 * unrelated file whose path happens to end the same way.
 */
export function moduleIdMatchesConfiguredEntry(
  moduleId: string,
  resolvedEntry: string,
  preserveSymlinks = false,
): boolean {
  const bare = stripModuleIdQuery(moduleId);

  if (preserveSymlinks) {
    // Vite deliberately keeps linked ids intact in this mode; realpathing
    // would make two spellings match that the rest of Vite treats as two
    // distinct modules.
    return path.resolve(bare) === path.resolve(resolvedEntry);
  }

  // Vite resolves module ids through the filesystem, while a configured root
  // may use an equivalent symlink spelling -- `/var` versus `/private/var` on
  // macOS is the everyday case. Comparing the strings alone misses the real
  // entry, and the failure is silent.
  return resolvePhysicalPath(bare) === resolvePhysicalPath(resolvedEntry);
}
