import { type InjectionKey, inject, provide } from './provide';

/**
 * @param providerName - The name(s) of the providing the context.
 *
 * There are situations where context can come from multiple scopes. In such cases, you might need to give an array of names to provide your context, instead of just a single string.
 *
 * @param contextName The description for injection key symbol.
 */
export function createContext<ContextValue>(
  providerName: string | string[],
  contextName?: string,
) {
  const symbolDescription =
    typeof providerName === 'string' && !contextName
      ? `${providerName}Context`
      : contextName;

  const injectionKey: InjectionKey = Symbol(symbolDescription);

  /**
   * @param fallback The context value to return if the injection fails.
   *
   * @throws When context injection failed and no fallback is specified.
   * This happens when the scope injecting the context is not a child of the root scope providing the context.
   */
  const injectContext = <
    T extends ContextValue | null | undefined = ContextValue,
  >(
    fallback?: T | (() => T),
  ): T extends null ? ContextValue | null : ContextValue => {
    const context = inject(injectionKey, fallback);
    if (context) return context;

    if (context === null) return context as any;

    throw new Error(
      `Injection \`${injectionKey.toString()}\` not found. Must be used within ${
        Array.isArray(providerName)
          ? `one of the following providers: ${providerName.join(', ')}`
          : `\`${providerName}\``
      }`,
    );
  };

  const provideContext = (contextValue: ContextValue) => {
    provide(injectionKey, contextValue);
    return contextValue;
  };

  return [injectContext, provideContext] as const;
}
