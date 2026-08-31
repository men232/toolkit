import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  moduleIdMatchesConfiguredEntry,
  normalizeDevEntry,
  resolveConfiguredEntry,
  stripModuleIdQuery,
} from './entry-match.ts';

describe('normalizeDevEntry', () => {
  it('roots a relative entry and leaves an already-rooted one alone', () => {
    expect(normalizeDevEntry('playground/index.tsx')).toBe('/playground/index.tsx');
    expect(normalizeDevEntry('./playground/index.tsx')).toBe('/playground/index.tsx');
    expect(normalizeDevEntry('././src/main.ts')).toBe('/src/main.ts');
    expect(normalizeDevEntry('/src/main.ts')).toBe('/src/main.ts');
    expect(normalizeDevEntry('/abs/path/main.ts')).toBe('/abs/path/main.ts');
  });
});

describe('resolveConfiguredEntry', () => {
  it('resolves the root-relative form against the Vite root', () => {
    expect(resolveConfiguredEntry('/project', '/src/main.ts')).toBe('/project/src/main.ts');
  });

  it('keeps a path that is already inside the root', () => {
    expect(resolveConfiguredEntry('/project', '/project/src/main.ts')).toBe(
      '/project/src/main.ts',
    );
  });

  it('prefers an existing absolute file outside the root over root-relative', () => {
    // Vite's resolver accepts it, and its module runner imports the id it was
    // given -- so matching has to make the same choice, or the dev connector
    // is injected into nothing and the app runs with no HMR and no error.
    const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'vue-stdout-entry-')));
    const file = path.join(dir, 'main.ts');
    writeFileSync(file, '');

    expect(resolveConfiguredEntry('/project', file)).toBe(file);
  });

  it('reads a missing absolute path as root-relative, the way Vite does', () => {
    expect(resolveConfiguredEntry('/project', '/nope/main.ts')).toBe(
      '/project/nope/main.ts',
    );
  });
});

describe('stripModuleIdQuery', () => {
  it('drops Vite query suffixes', () => {
    expect(stripModuleIdQuery('/a/App.vue?vue&type=script')).toBe('/a/App.vue');
    expect(stripModuleIdQuery('/a/App.vue')).toBe('/a/App.vue');
  });
});

describe('moduleIdMatchesConfiguredEntry', () => {
  it('matches exactly, never by suffix', () => {
    // A suffix match would inject the dev connector into any unrelated file
    // whose path merely ends the same way, silently.
    expect(moduleIdMatchesConfiguredEntry('/p/src/main.ts', '/p/src/main.ts')).toBe(true);
    expect(moduleIdMatchesConfiguredEntry('/other/src/main.ts', '/p/src/main.ts')).toBe(
      false,
    );
  });

  it('ignores a query suffix on the module id', () => {
    expect(
      moduleIdMatchesConfiguredEntry('/p/src/main.ts?v=1', '/p/src/main.ts'),
    ).toBe(true);
  });

  it('matches through a symlink, and stops doing so under preserveSymlinks', () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vue-stdout-entry-')));
    const real = path.join(root, 'real');
    mkdirSync(real);
    const file = path.join(real, 'main.ts');
    writeFileSync(file, '');
    symlinkSync(real, path.join(root, 'link'));
    const linked = path.join(root, 'link', 'main.ts');

    expect(moduleIdMatchesConfiguredEntry(linked, file)).toBe(true);
    // Vite deliberately keeps linked ids intact in this mode, and treats the
    // two spellings as two distinct modules; matching must agree.
    expect(moduleIdMatchesConfiguredEntry(linked, file, true)).toBe(false);
  });
});
