import { Expression } from './Expression';
import type { NodeProgram } from './types';

/**
 * Parses a query string into a NodeProgram representation.
 *
 * @param {string} value - The query string to be parsed.
 * @returns {NodeProgram} - The parsed representation of the query.
 *
 * @example
 * const program = parseQuery('age > 30');
 * console.log(program);
 * // {
 * //   type: 'program',
 * //   body: [
 * //     {
 * //       type: 'binary-expression',
 * //       operator: '>',
 * //       left: { type: 'identifier', name: 'age' },
 * //       right: { type: 'literal', value: 30 }
 * //     }
 * //   ]
 * // }
 *
 * @group Main
 */
export function parseQuery(value: string): NodeProgram {
  return new Expression(value).parse();
}
