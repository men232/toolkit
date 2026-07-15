/**
 * Source: https://github.com/kourge/ts-brand/blob/master/src/index.ts
 */

/**
 * A `Brand` is a type that takes at minimum two type parameters. Given a base
 * type `Base` and some unique and arbitrary branding type `Branding`, it
 * produces a type based on but distinct from `Base`. The resulting branded
 * type is not directly assignable from the base type, and not mutually
 * assignable with another branded type derived from the same base type.
 *
 * Take care that the branding type is unique. Two branded types that share the
 * same base type and branding type are considered the same type! There are two
 * ways to avoid this.
 *
 * The first way is to supply a third type parameter, `ReservedName`, with a
 * string literal type that is not `__type__`, which is the default.
 *
 * The second way is to define a branded type in terms of its surrounding
 * interface, thereby forming a recursive type. This is possible because there
 * are no constraints on what the branding type must be. It does not have to
 * be a string literal type, even though it often is.
 *
 * @example
 * ```
 * type Path = Brand<string, 'path'>;
 * type UserId = Brand<number, 'user'>;
 * type DifferentUserId = Brand<number, 'user', '__kind__'>;
 * interface Post { id: Brand<number, Post> }
 * ```
 */
export type Brand<
  Base,
  Branding,
  ReservedName extends string = '__type__',
> = Base & { [K in ReservedName]: Branding } & { __witness__: Base };

/**
 * An `AnyBrand` is a branded type based on any base type branded with any
 * branding type. By itself it is not useful, but it can act as type constraint
 * when manipulating branded types in general.
 */
export type AnyBrand = Brand<unknown, any>;

/**
 * `BrandTypeOf` is a type that takes any branded type `B` and yields its base type.
 */
export type BrandTypeOf<B extends AnyBrand> = B['__witness__'];
