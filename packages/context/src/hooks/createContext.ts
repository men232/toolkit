import { type InjectionKey, inject, provide } from './provide';

export type InjectContextFn<T> = <D extends T | null = T>(
  fallback?: D | (() => D),
) => D extends null ? T | null : T;

export type ProvideContextFn<T> = (value: T) => T;

/**
 * Wrapper around `provide/inject` function to simple usage.
 *
 * @param providerName - The name(s) of the providing the context.
 *
 * There are situations where context can come from multiple scopes. In such cases, you might need to give an array of names to provide your context, instead of just a single string.
 *
 * @param contextName The description for injection key symbol.
 *
 * @example
 * const [injectTraceId, provideTraceId] = createContext<string>('withContext');
 *
 * // this function will returns the same trace if for execution context
 * export const useTraceId = () => {
 *   let traceId = injectTraceId(null);
 *
 *   if (!traceId) {
 *     traceId = uuidv4();
 *     provideTraceId(traceId);
 *   }
 *
 *   return traceId;
 * };
 *
 * @group Main
 */
export function createContext<T, J = Exclude<T, undefined | null>>(
  providerName: string | string[],
  contextName?: string,
): [InjectContextFn<J>, ProvideContextFn<J>] {
  var symbolDescription =
    typeof providerName === 'string' && !contextName
      ? `${providerName}Context`
      : contextName;

  var injectionKey: InjectionKey = Symbol(symbolDescription);

  /**
   * @param fallback The context value to return if the injection fails.
   *
   * @throws When context injection failed and no fallback is specified.
   * This happens when the scope injecting the context is not a child of the root scope providing the context.
   */
  const injectContext: InjectContextFn<J> = fallback => {
    const context = inject(injectionKey, fallback);

    if (context !== undefined) {
      return context as J;
    }

    throw new Error(
      `Injection \`${injectionKey.toString()}\` not found. Must be used within ${
        Array.isArray(providerName)
          ? `one of the following providers: ${providerName.join(', ')}`
          : `\`${providerName}\``
      }`,
    );
  };

  const provideContext: ProvideContextFn<J> = contextValue => {
    provide(injectionKey, contextValue);
    return contextValue;
  };

  return [injectContext, provideContext];
}
