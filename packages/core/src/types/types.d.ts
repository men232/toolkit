export type Arrayable<T> = T[] | T;

export type Awaitable<T> = Promise<T> | T;

export type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never;

export type FunctionArgs<Args extends any[] = any[], Return = void> = (
  ...args: Args
) => Return;

export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

export type AnyFunction = (...args: any[]) => any;

export type Data = Record<string, unknown>;

export type GenericObject = Record<string, any>;

export interface SelectOptionItem<T = any> {
  text: string;
  value: T;
  props?: any;
}

export type SelectOptions<T = any> = SelectOptionItem<T>[];

export type OverwriteWith<T1, T2> =
  IsAny<T2> extends true ? T1 : Omit<T1, keyof T2> & T2;

export type IsAny<T> = boolean extends (T extends never ? true : false)
  ? true
  : false;

export type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;

/**
 * @example
 * LiteralUnion<'foo' | 'bar', string>
 *
 * @see {@link https://github.com/microsoft/TypeScript/issues/29729}
 */
export type LiteralUnion<Union, Type> = Union | (Type & Nothing);

export interface Nothing {}

export type ValuesOfObject<T> = T[keyof T];

export type Fn = () => void;

export type PromisifyFn<T extends AnyFunction> = (
  ...args: ArgumentsType<T>
) => Promise<ReturnType<T>>;

/**
 * Represent time object in 24h format
 */
export type TimeObject = {
  /**
   * Hour (0 - 23).
   */
  h: number;

  /**
   * Minutes (0 - 59).
   */
  m: number;
};

/**
 * Represent date object
 */
export type DateObject = {
  /**
   * The year of the date (e.g., 2024).
   */
  year: number;

  /**
   * The month of the date (1 = January, 12 = December).
   */
  month: number;

  /**
   * The day of the month (1-31).
   */
  date: number;
};

export interface ThemeConfig {
  colors: {
    [x: string]: Record<string, string>;
  };
  variables: {
    [x: string]: Record<string, string | number>;
  };
}

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export interface SelectOptionItem<T = any> {
  text: string;
  value: T;
  props?: any;
}

export type Primitive =
  | null
  | undefined
  | string
  | number
  | bigint
  | boolean
  | symbol;
