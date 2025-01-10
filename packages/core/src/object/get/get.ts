import _get from 'lodash/get.js';

/**
 * Get object property by dot notation
 *
 * @example
 * const user = { id: 1, data: { roles: ['admin'] } };
 * const roles = get(user, 'data.roles');
 *
 * console.log(roles) // ['admin']
 *
 * @group Object
 */
export const get = _get;
