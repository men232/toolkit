/**
 * Check if object has own property
 *
 * @group Object
 */
export const hasOwn = <T extends object, K extends keyof T>(
  val: T,
  key: K,
): key is K => Object.prototype.hasOwnProperty.call(val, key);
