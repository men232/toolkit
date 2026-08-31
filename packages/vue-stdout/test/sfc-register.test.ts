import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { load } from '../src/sfc/hook';

const run = promisify(execFile);
const here = fileURLToPath(new URL('.', import.meta.url));

const notCalled = () => {
  throw new Error('nextLoad should not run for a .vue url');
};

// The hook must be exercised in a real Node process: vitest loads .vue through
// vite, which would bypass the very thing under test.
describe('register hook', () => {
  it('lets plain node import a .vue file when chained after tsx', async () => {
    const script = `
      import { renderToString } from '${here}../src/index.ts';
      import App from '${here}fixtures/Simple.vue';
      process.stdout.write(JSON.stringify(renderToString(App, { columns: 20 })));
    `;

    const { stdout, stderr } = await run(
      process.execPath,
      [
        '--import', 'tsx',
        '--import', `${here}../src/sfc/register.ts`,
        '--input-type=module',
        '--eval', script,
      ],
      { cwd: `${here}..` },
    );

    expect(JSON.parse(stdout)).toBe('from sfc12');
    expect(stderr).toBe('');
  });

  // The aim: `<stdout-box>` must compile to an element, not
  // `resolveComponent('stdout-box')`.
  // Since Vue 3.4 `parse()` decides that — it fixes each tag's `tagType` while
  // building the AST that `compileScript({ inlineTemplate: true })` then
  // reuses — so `isCustomElement` has to reach `parse()`, not just
  // `templateOptions`. Asserting on rendered output cannot see this: the
  // failed lookup still renders the tag as an element, and only warns.
  it('compiles intrinsic tags as elements, not components', async () => {
    const url = pathToFileURL(`${here}fixtures/Simple.vue`).href;

    const { source } = await load(url, {}, notCalled);

    expect(source).not.toContain('resolveComponent');
  });
});
