import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

type LoadContext = { format?: string | null };
type LoadResult = { format: string; source: string; shortCircuit?: boolean };
type NextLoad = (url: string, context: LoadContext) => Promise<LoadResult>;

export async function load(
  url: string,
  context: LoadContext,
  nextLoad: NextLoad,
): Promise<LoadResult> {
  if (!url.endsWith('.vue')) {
    return nextLoad(url, context);
  }

  const sfc = await import('@vue/compiler-sfc').catch(() => {
    throw new Error(
      '@andrew_l/vue-stdout/register needs "@vue/compiler-sfc". Install it to use .vue files.',
    );
  });

  const filename = fileURLToPath(url);
  const source = await readFile(filename, 'utf8');
  const id = createHash('sha256').update(filename).digest('hex').slice(0, 8);

  // Explicit extension: this module runs in Node's loader thread, where the
  // specifier is resolved by Node itself rather than by a bundler. An
  // extensionless relative specifier is not resolvable there -- it only ever
  // worked because tsx@4.19 patched resolution to guess the extension, and
  // tsx@4.22 stopped. `.ts` (legal here via `allowImportingTsExtensions`)
  // keeps resolution plain-Node-correct and leaves tsx only the transform,
  // matching how `register.ts` already names `./hook.ts`.
  const { compilerOptions } = await import('./compiler-options.ts');

  // The host tags are private (`compiler-options.ts`), so a consumer's SFC
  // names `<Box>`/`<Text>` and never needs this. It stays because the compiler
  // still has to be able to read a template that does name a host tag — this
  // package's own `test/fixtures/Simple.vue`, and anything a consumer writes
  // against the private surface knowingly.
  //
  // `isCustomElement` has to reach `parse()` as well, not just
  // `templateOptions`: since Vue 3.4 the parser is what fixes each tag's
  // `tagType`, and `compileScript({ inlineTemplate: true })` reuses the AST
  // built here. Passed only to `templateOptions`, it arrives after
  // `<stdout-box>` has already been classified a component, and the render
  // function compiles to `resolveComponent('stdout-box')` — which warns into
  // the user's terminal on every mount.
  const { descriptor, errors } = sfc.parse(source, {
    filename,
    templateParseOptions: compilerOptions,
  });

  if (errors.length > 0) {
    throw new Error(`${filename}: ${errors[0]!.message}`);
  }

  const script = sfc.compileScript(descriptor, {
    id,
    inlineTemplate: true,
    genDefaultAs: '__sfc__',
    templateOptions: { compilerOptions },
  });

  let code =
    script.content +
    `\n__sfc__.__file = ${JSON.stringify(filename)};\nexport default __sfc__;\n`;

  if (script.lang === 'ts' || script.lang === 'tsx') {
    const esbuild = await import('esbuild').catch(() => {
      throw new Error(
        '@andrew_l/vue-stdout/register needs "esbuild" for <script lang="ts">. Install it.',
      );
    });

    code = esbuild.transformSync(code, {
      loader: 'ts',
      target: `node${process.versions.node.split('.')[0]}`,
    }).code;
  }

  return { format: 'module', shortCircuit: true, source: code };
}
