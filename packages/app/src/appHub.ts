import {
  type Data,
  type ExecSkip,
  asyncForEach,
  camelCase,
  capitalize,
  isError,
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
import type { ObjectPropsOptions } from './utils/props.js';

/**
 * Combine multiple app definitions into a single orchestrated app.
 * Props from each definition are namespaced by their app name.
 * @group Utils
 */
export function createAppHub(definitions: AppDefinition[]): AppDefinition {
  const app = defineApp({
    name: 'app-hub',
    description: `Application wrapper around: ${definitions.map(v => v.name).join(', ')}`,
    logger: false,
    props: prefixifyProps(definitions),
    setup(props) {
      const instances: AppInstance[] = [];
      const setupSkips: ExecSkip<{ app: AppInstance }>[] = [];

      return asyncForEach(definitions, definition => {
        const appProps: Data = getPrefixedProps(definition, props);

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
  const getError = (r: ExecSkip): string => {
    if ('error' in r && isError(r.error)) {
      return r.error.stack
        ? `\n${r.error.message}\n${r.error.stack}`
        : `\n${r.error.message}`;
    }

    return '';
  };

  const lines = skips.map(s =>
    s.reason
      ? `  ${s.app.definition.name} [${s.code}]: ${s.reason}${getError(s).replaceAll('\n', '\n    ')}`
      : `  ${s.app.definition.name} [${s.code}]${getError(s).replaceAll('\n', '\n    ')}`,
  );
  return new Error(
    `Failed to ${verb} ${skips.length} app(s):\n${lines.join('\n')}`,
    { cause: 'error' in skips[0] ? skips[0].error : undefined },
  );
}

export function getPrefixedProps(definition: AppDefinition, props: Data): Data {
  const result: Data = pickPrefixed(props, {
    prefix: camelCase(definition.name),
    prefixTrim: true,
  });

  for (const [key, value] of Object.entries(result)) {
    const propName = key.charAt(0).toLowerCase() + key.slice(1).toLowerCase();
    result[propName] = value;
    delete result[key];
  }

  return result;
}

export function prefixifyProps(
  definitions: AppDefinition[],
): ObjectPropsOptions {
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

  return props;
}
