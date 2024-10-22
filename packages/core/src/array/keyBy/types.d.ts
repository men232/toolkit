export type MaybePropertyKey<T> = T extends object
  ? keyof T | PropertyKey
  : PropertyKey;

export type PropertyKeyLiteralToType<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends symbol
      ? symbol
      : T;

export type IsPropertyKey<T, V, L> = T extends object
  ? V extends keyof T
    ? T[V]
    : L
  : PropertyKeyLiteralToType<L>;
