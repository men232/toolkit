import type { DeepPartial } from '@andrew_l/toolkit';
import { Transform } from 'node:stream';
import abstractTransport from 'pino-abstract-transport';
import pump from 'pump';
import { pretty } from './pretty.js';
import { buildSafeSonicBoom } from './utils/index.js';
import { parseOptions } from './utils/parseOptions.js';

export namespace PinoPretty {
  export type Options = DeepPartial<import('./types.js').PrettyOptions>;
}

/**
 * Processes the supplied options and returns a function that accepts log data
 * and produces a prettified log string.
 */
function prettyFactory(options: PinoPretty.Options) {
  const opts = parseOptions(options);
  return pretty.bind(opts);
}

/**
 * Constructs a of stream to which the produced
 * prettified log data will be written.
 */
export function build(opts: PinoPretty.Options = {}) {
  var destination: any;

  return abstractTransport(
    function (source) {
      var pretty = prettyFactory({
        messageKey: (source as any).messageKey || 'msg',
        ...opts,
      });

      const stream = new Transform({
        objectMode: true,
        autoDestroy: true,
        transform(chunk, enc, cb) {
          const line = pretty(chunk);
          cb(null, line + '\n');
        },
      });

      destination = buildSafeSonicBoom({
        dest: 1,
        append: true,
        mkdir: true,
        sync: false,
      });

      source.on('unknown', function (line) {
        destination.write(line + '\n');
      });

      pump(source, stream, destination);
      return stream;
    },
    {
      expectPinoConfig: true,
      enablePipelining: false as any,
      close(err, cb) {
        destination.on('close', () => {
          cb(err);
        });
      },
    },
  );
}

export default build;
