import { fastIdle } from '../fastIdle';

/**
 * Creates a cooldown function that resolves after a specified number of executions (`amount`).
 * The cooldown can either occur on the `next` tick or after a specified delay.
 *
 * This is useful for controlling the rate of asynchronous operations, allowing you to pause
 * for a specified amount of time after a certain number of iterations in a loop.
 *
 * @example
 * // Create a cooldown function that waits 1 tick for every 10th execution
 * const cooldown = nextTickIteration(10);
 *
 * for (const item of array) {
 *     await cooldown(); // Wait 1 tick for every 10th call
 *     // Perform some async operation here
 * }
 *
 * @example
 * // Create a cooldown function with a 100ms delay after every 5 executions
 * const cooldownWithDelay = nextTickIteration(5, 100);
 * for (const item of array) {
 *     await cooldownWithDelay(); // Wait 100ms after every 5th call
 *     // Perform some async operation here
 * }
 *
 * @param amount The number of executions after which the cooldown should occur.
 * @param delay The delay type or amount. If 'tick', it uses the next idle tick.
 *              If a number is provided, it specifies a delay in milliseconds.
 * @returns A function that, when called, returns a promise resolving after the specified cooldown period.
 *
 * @group Promise
 */
export function nextTickIteration(
  amount: number,
  delay: number | 'tick' = 'tick',
): () => Promise<void> {
  let counter = 0;

  const tickInterval = delay === 'tick';

  return () => {
    counter++;

    if (counter >= amount) {
      counter = 0;
      return new Promise(resolve => {
        if (tickInterval) {
          fastIdle(resolve);
        } else {
          setTimeout(resolve, delay);
        }
      });
    }

    return Promise.resolve();
  };
}
