import {
  type AnyFunction,
  type LogLevel,
  captureStackTrace,
  delay,
  isSkip,
} from '@andrew_l/toolkit';
import { type AppDefinition, defineApp, shutdownApp } from './app.ts';
import { filePathFromStack } from './utils/filePathFromStack.ts';
import type { ObjectPropsOptions } from './utils/props.ts';

/**
 * Define an script application with typed props and shutdown after entry execution.
 *
 * When executed directly (`node app.ts`), the CLI is launched automatically.
 * @group Main
 * @example
 * ```ts
 * import { defineScript, getRandomInt } from '@andrew_l/app';
 *
 * export default defineScript({
 *   name: 'server',
 *   props: {
 *     minValue: { type: Number, default: () => 0 },
 *     maxValue: { type: Number, default: () => 100 },
 *   },
 *   async entry({ minValue, maxValue }) {
 *     this.log.info('Making heavy computation...');
 *     await delay(1000);
 *     this.log.info('Random value: %', getRandomInt(minValue, maxValue));
 *   },
 * });
 * ```
 */
export function defineScript<
  P extends ObjectPropsOptions = ObjectPropsOptions,
  S extends Record<string, any> = {},
  M extends Record<string, AnyFunction> = {},
>({
  entry,
  filePath,
  ...definition
}: AppDefinition<P, S, M>): AppDefinition<P, S, M> {
  return defineApp({
    ...definition,
    entry(...args) {
      return Promise.resolve()
        .then(() => entry?.apply(this, args))
        .catch(error => {
          process.exitCode = 1;
          this.log.error(error);
        })
        .then(() => {
          delay('tick')
            .then(() => shutdownApp(this.app))
            .then(shutdownResult => {
              if (isSkip(shutdownResult)) {
                const logLevel: LogLevel =
                  shutdownResult.code === 'shutdown_app_error'
                    ? 'error'
                    : 'warn';

                this.log[logLevel](
                  'Application shutdown issue',
                  shutdownResult,
                );
              }
            });
        });
    },
    filePath: filePath ?? filePathFromStack(captureStackTrace(defineScript)),
  });
}
