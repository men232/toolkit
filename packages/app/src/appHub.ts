import {
  type Data,
  type ExecSkip,
  asyncForEach,
  camelCase,
  capitalize,
  isNumber,
  isSkip,
  pickPrefixed,
} from '@andrew_l/toolkit';
import {
  type AppDefinition,
  type AppInstance,
  createAppInstance,
  defineApp,
  runApp,
  setupApp,
  shutdownApp,
  stopApp,
} from './app.js';
import { createAppThread } from './appThread.ts';
import type { ObjectPropsOptions } from './utils/props.js';

/**
 * Combine multiple app definitions into a single orchestrated app.
 * Props from each definition are namespaced by their app name.
 * @group Internals
 */
export function createAppHub(definitions: AppDefinition[]): AppDefinition {
  const props: ObjectPropsOptions = {};

  // Merge with prefix all props
  for (const definition of definitions) {
    if (definition.props) {
      for (const [propName, prop] of Object.entries(definition.props)) {
        props[camelCase(`${definition.name}${capitalize(propName)}`)] =
          prop as any;
      }
    }
  }

  const app = defineApp({
    name: 'app-hub',
    description: `Application wrapper around: ${definitions.map(v => v.name).join(', ')}`,
    logging: false,
    props,
    setup(props) {
      const instances: AppInstance[] = [];
      const setupSkips: ExecSkip<{ app: AppInstance }>[] = [];

      return asyncForEach(definitions, definition => {
        const appProps: Data = getAppProps(definition, props);

        // Wrap app definition with app threads
        if (isNumber(appProps.threads) && appProps.threads > 1) {
          definition = createAppThread(definition);
        }

        const instance = createAppInstance(definition);

        instances.push(instance);

        return setupApp(instance, appProps).then(setupResult => {
          if (isSkip(setupResult)) {
            setupSkips.push({ ...setupResult, app: instance });
          }
        });
      }).then(() => {
        if (setupSkips.length) {
          throw skipExecsToError('setup', setupSkips);
        }

        return { instances };
      });
    },
    entry() {
      const runSkips: ExecSkip<{ app: AppInstance }>[] = [];

      return asyncForEach(this.instances, instance => {
        return runApp(instance).then(runResult => {
          if (isSkip(runResult)) {
            runSkips.push({ ...runResult, app: instance });
          }
        });
      }).then(() => {
        if (runSkips.length) {
          throw skipExecsToError('start', runSkips);
        }
      });
    },
    stop() {
      const stopSkips: ExecSkip<{ app: AppInstance }>[] = [];

      return asyncForEach(this.instances, instance => {
        return stopApp(instance).then(stopResult => {
          if (isSkip(stopResult)) {
            stopSkips.push({ ...stopResult, app: instance });
          }
        });
      }).then(() => {
        if (stopSkips.length) {
          throw skipExecsToError('stop', stopSkips);
        }
      });
    },
    shutdown() {
      const shutdownSkips: ExecSkip<{ app: AppInstance }>[] = [];

      return asyncForEach(this.instances, instance => {
        return shutdownApp(instance).then(shutdownResult => {
          if (isSkip(shutdownResult)) {
            shutdownSkips.push({ ...shutdownResult, app: instance });
          }
        });
      }).then(() => {
        if (shutdownSkips.length) {
          throw skipExecsToError('shutdown', shutdownSkips);
        }
      });
    },
  });

  return app;
}

function skipExecsToError(
  verb: string,
  skips: ExecSkip<{ app: AppInstance }>[],
): Error {
  const lines = skips.map(s =>
    s.reason
      ? `  ${s.app.definition.name} [${s.code}]: ${s.reason}`
      : `  ${s.app.definition.name} [${s.code}]`,
  );
  return new Error(
    `Failed to ${verb} ${skips.length} app(s):\n${lines.join('\n')}`,
    { cause: 'error' in skips[0] ? skips[0].error : undefined },
  );
}

function getAppProps(definition: AppDefinition, props: Data): Data {
  const result: Data = pickPrefixed(props, {
    prefix: camelCase(definition.name),
    prefixTrim: true,
  });

  for (const [key, value] of Object.entries(result)) {
    delete result[key];
    result[key.charAt(0).toLowerCase() + key.slice(1).toLowerCase()] = value;
  }

  return result;
}
