import { describe, expect, it } from 'vitest';
import { renderToString } from '../src/index';
import Simple from './fixtures/Simple.vue';

describe('vite preset', () => {
  it('loads a .vue fixture inside vitest and renders it', () => {
    expect(renderToString(Simple, { columns: 20 })).toBe('from sfc12');
  });

  it('does not warn about unknown components', () => {
    const warnings: string[] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));

    try {
      renderToString(Simple, { columns: 20 });
    } finally {
      console.warn = original;
    }

    expect(warnings.filter(w => w.includes('Failed to resolve component'))).toEqual([]);
  });
});
