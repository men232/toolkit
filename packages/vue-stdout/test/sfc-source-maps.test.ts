import { describe, expect, it } from 'vitest';
import { renderToString } from '../src/index';
import Probe from './fixtures/SourceMapProbe.vue';

// `.vue` source maps are load-bearing and easy to lose silently: the compiled
// render function keeps the `.vue` filename, so a broken map still produces a
// stack frame that *looks* right and only the line number gives it away.
//
// This is not hypothetical. The wrapper this package used to ship
// (`forceClientTransform`) handed `@vitejs/plugin-vue` a config reporting
// `command: 'build'`, and that plugin derives `sourceMap` from `command`, so
// the wrapper turned `.vue` maps off under vitest while every test stayed
// green. Measured against this fixture: the same throw reported
// `SourceMapProbe.vue:17:10` and `:19:3` — positions from the compiled output,
// one of them past the end of a 17-line file — instead of `:9:9` and `:12:1`.
//
// Hence a stack frame, not the existence of a `.map` file: only reading the
// frame catches the failure that was actually paid for. See
// `.agents/docs/gotchas.md#the-vue-plugins-that-needed-patching-and-the-ones-that-do-not`.
describe('sfc source maps', () => {
  it('maps a throw inside a .vue file back to its source position', () => {
    let stack = '';

    try {
      renderToString(Probe, { columns: 20 });
    } catch (error) {
      stack = (error as Error).stack ?? '';
    }

    expect(stack).toContain('sfc-source-map-probe');

    const frames = stack
      .split('\n')
      .filter(line => line.includes('SourceMapProbe.vue'))
      .map(line => line.replace(/^.*SourceMapProbe\.vue/, 'SourceMapProbe.vue'));

    expect(frames.slice(0, 2)).toEqual([
      // `throw new Error(...)` — line 9, at the `new`.
      'SourceMapProbe.vue:9:9)',
      // the top-level `boom()` call — line 12.
      'SourceMapProbe.vue:12:1)',
    ]);
  });
});
