import { assert } from '@/assert';
import { isPlainObject } from '@/is';
import type { Awaitable } from '@/types';
import { EJSONStream, type EJSONStreamOptions } from './EJSONStream';
import { instance } from './instance';

export interface EJSONStreamOptionsWithPayload extends Partial<EJSONStreamOptions> {
  prepend?: () => Awaitable<object | null | undefined>;
  append?: () => Awaitable<object | null | undefined>;
  resultKey: string;
}

/**
 * Creates an instance of `EJSONStream`. This function provides flexibility to create a simple stream
 * or one with custom payload transformations, such as appending or prepending data.
 *
 * The function has overloads to handle either basic streaming options or more advanced use cases
 * with payload functions (`append`, `prepend`, `resultKey`) to modify how JSON payloads are streamed.
 *
 * @function
 * @param {Partial<EJSONStreamOptions> | EJSONStreamOptionsWithPayload} [options] - Options to configure the EJSONStream.
 * @returns {EJSONStream} An instance of the `EJSONStream`.
 *
 * @example
 * // Example 1: Create a simple EJSONStream without custom payload transformations
 * const stream = createEJSONStream();
 *
 * @example
 * // Example 2: Create EJSONStream with specific options
 * const stream = createEJSONStream({
 *   cl: ']',
 *   op: '[',
 *   sep: ',',
 *   ejson: someInstance
 * });
 *
 * @example
 * // Example 3: Using prepend and append payloads
 * const streamWithPayloads = createEJSONStream({
 *   prepend: async () => ({ key1: 'value1' }),
 *   append: async () => ({ key2: 'value2' }),
 *   resultKey: 'payload'
 * });
 *
 * // {"key1":"value1","payload": [...data],"key2":"value2"}
 *
 * @replaces `res.write('['); rows.forEach((r, i) => res.write((i ? ',' : '') + JSON.stringify(r))); res.write(']')` — a
 * `TransformStream` that emits `[`, separators and `]`, optionally inside an object via `resultKey`/`prepend`/`append`.
 * Caveats: items use the default EJSON (Dates become `{"$date": ms}`; pass `ejson: createEJSON()` for plain JSON),
 * `prepend`/`append` always use the default EJSON, and `resultKey` is inserted without JSON escaping.
 * @detect `\.write\(\s*['"]\[['"]\s*\)`
 * @detect `\.(?:write|enqueue)\(\s*['"],['"]\s*\)`
 * @detect `\.write\(\s*\(?\s*\w+\s*\?\s*['"],['"]\s*:\s*['"]['"]\s*\)?\s*\+`
 *
 * @group EJSON
 */
export function createEJSONStream(
  options?: Partial<EJSONStreamOptions>,
): EJSONStream;

export function createEJSONStream(
  options: EJSONStreamOptionsWithPayload,
): EJSONStream;

export function createEJSONStream(
  options: Partial<EJSONStreamOptionsWithPayload> = {},
): EJSONStream {
  if (options.resultKey || options.append || options.prepend) {
    return createEJSONStreamPayload(options);
  }

  return new EJSONStream(getOptions(options));
}

function createEJSONStreamPayload(
  options: Partial<EJSONStreamOptionsWithPayload>,
): EJSONStream {
  let { cl, ejson, op, sep } = getOptions(options);
  const { append, prepend, resultKey } = options;

  assert.notEmptyString(resultKey, 'resultKey required.');

  const keyPart = JSON.stringify(resultKey) + ':';

  const stream = new EJSONStream({
    ejson,
    cl,
    op,
    sep,
    onStart(controller) {
      if (!prepend) {
        controller.enqueue('{' + keyPart);
        return Promise.resolve();
      }

      return Promise.resolve()
        .then(() => prepend())
        .then(data => {
          if (data === null || data === undefined) {
            controller.enqueue('{' + keyPart);
            return;
          }

          assert.ok(
            isPlainObject(data),
            'prepend result expected to be plain object',
          );

          const dataPart = ejson.stringify(data).slice(0, -1);

          // Empty prepend object
          if (dataPart === '{') {
            controller.enqueue('{' + keyPart);
            return;
          }

          controller.enqueue(dataPart + sep + keyPart);
        });
    },
    onFlush(controller) {
      if (!append) {
        controller.enqueue('}');
        return Promise.resolve();
      }

      return Promise.resolve()
        .then(() => append())
        .then(data => {
          if (data === null || data === undefined) {
            controller.enqueue('}');
            return;
          }

          assert.ok(
            isPlainObject(data),
            'append result expected to be plain object',
          );

          const dataPart = ejson.stringify(data).slice(1);

          // Empty append object
          if (dataPart === '}') {
            controller.enqueue(`}`);
            return;
          }

          controller.enqueue(`${sep}${dataPart}`);
        });
    },
  });

  return stream;
}

function getOptions(options: Partial<EJSONStreamOptions>): EJSONStreamOptions {
  const { ejson = instance, cl = ']', op = '[', sep = ',' } = options;

  return {
    cl,
    ejson,
    op,
    sep,
  };
}
