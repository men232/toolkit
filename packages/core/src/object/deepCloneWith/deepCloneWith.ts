import { arrayable } from '@/array/arrayable';
import { isError, isPrimitive, isString } from '@/is';
import type { Arrayable } from '@/types';
import _cloneDeepWith from 'lodash/cloneDeepWith';
import { def } from '../def';

const WITH_CUSTOMIZER_FACTORY_SYM = Symbol();

export type WithCustomizer = (
  value: any,
  key: number | string | undefined,
) => any;

export type WithCustomizerFactory = () => WithCustomizer;

export type WithCustomizerValue = Arrayable<
  WithCustomizer | WithCustomizerFactory
>;

/**
 * Same as `deepClone` but with customizer function.
 *
 * @group Object
 */
export function deepCloneWith<T>(value: T, customizer: WithCustomizerValue): T {
  const fns = prepareCustomizes(customizer);

  return _cloneDeepWith(value, (value, key) => {
    let newValue;
    let replaced = false;

    for (const fn of fns) {
      newValue = fn(value, key);

      if (newValue !== undefined) {
        value = newValue;
        replaced = true;
      }
    }

    if (replaced) return value;
  });
}

export function createDeepCloneWith(
  customizer: WithCustomizerValue,
): <T>(value: T) => T {
  return value => {
    return deepCloneWith(value, customizer);
  };
}

function prepareCustomizes(value: WithCustomizerValue): WithCustomizer[] {
  return arrayable(value).map(v => (isCustomizerFactory(v) ? v() : v));
}

export function isCustomizerFactory(
  value: unknown,
): value is WithCustomizerFactory {
  // @ts-expect-error
  return value?.[WITH_CUSTOMIZER_FACTORY_SYM] === true;
}

export function createCustomizer(fn: WithCustomizer): WithCustomizer {
  return fn;
}

export function createCustomizerFactory(
  fn: (...args: any[]) => WithCustomizer,
): WithCustomizerFactory {
  def(fn, WITH_CUSTOMIZER_FACTORY_SYM, true);
  return fn;
}

export function createSecureCustomizer(
  properties: string[],
): WithCustomizerFactory {
  const secureLabel = `<** secure **>`;
  const circularLabel = `<** circular **>`;
  const propertiesSet = Object.freeze(
    new Set(properties.map(v => v.toLocaleLowerCase())),
  );

  const withCustomizer = (
    seenSet: WeakSet<any>,
    value: any,
    key?: PropertyKey,
  ): any => {
    if (isPrimitive(value)) {
      if (!isString(key)) return;
      if (!propertiesSet.has(key.toLocaleLowerCase())) return;

      return secureLabel;
    }

    if (seenSet.has(value)) {
      return circularLabel;
    }

    seenSet.add(value);

    if (isError(value)) {
      return {
        message: value.message,
        stack: value.stack,
        name: value.name,
      };
    }
  };

  return createCustomizerFactory(() => {
    const seenSet = new WeakSet();
    return withCustomizer.bind(null, seenSet);
  });
}
