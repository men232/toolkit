import ServiceContainer from './ServiceContainer';

/**
 * This interface can be augmented by users to add types to ioc
 */
interface IocMap {}

/**
 * Get instance of service
 * @example
 * const userService ioc('UserService');
 *
 * @group Main
 */
export function ioc<Key extends keyof IocMap>(id: Key): IocMap[Key] {
  return ServiceContainer.get(id as any) as any;
}
export type { IocMap };
