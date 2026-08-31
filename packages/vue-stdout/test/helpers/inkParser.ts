import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ink does not declare its internal `parse-keypress` module in `exports`,
// but it ships the compiled file in its build output, sitting next to
// `index.js`. Resolving `require.resolve('ink')` and walking to the
// sibling file reaches it without hardcoding a `.pnpm` path (which would
// break the moment the lockfile's content hash changes).
const req = createRequire(import.meta.url);
const inkDir = path.dirname(req.resolve('ink'));

const load = async (file: string) => {
  const full = path.join(inkDir, file);
  try {
    return await import(pathToFileURL(full).href);
  } catch (error) {
    throw new Error(
      `Could not load ink's internal ${file} for differential testing. ` +
        `It is not in ink's "exports", so this depends on its build layout ` +
        `(currently: resolve('ink') -> sibling file next to index.js). ` +
        `If ink's package layout changed, update test/helpers/inkParser.ts. ` +
        `Resolved to: ${full}`,
      { cause: error },
    );
  }
};

const parseKeypressModule = await load('parse-keypress.js');
const inputParserModule = await load('input-parser.js');

export const inkNonAlphanumericKeys = parseKeypressModule.nonAlphanumericKeys as string[];

export const inkParseKeypress = parseKeypressModule.default as (
  input: Uint8Array | string,
) => {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  sequence: string;
  raw: string | undefined;
  code?: string;
  super?: boolean;
  hyper?: boolean;
  capsLock?: boolean;
  numLock?: boolean;
  eventType?: 'press' | 'repeat' | 'release';
  isKittyProtocol?: boolean;
  text?: string;
  isPrintable?: boolean;
};

export type InkInputEvent = string | { readonly paste: string };

export type InkInputParser = {
  push: (chunk: string) => InkInputEvent[];
  hasPendingEscape: () => boolean;
  flushPendingEscape: () => string | undefined;
  reset: () => void;
};

export const inkCreateInputParser =
  inputParserModule.createInputParser as () => InkInputParser;
