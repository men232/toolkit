import { fastIdle } from '../fastIdle';

/**
 * Create a function to make cooldown after `amount` execution
 *
 * @example
 * const cooldown = nextTickIteration(10);
 *
 * for (const item of array) {
 *     await cooldown(); // wait 1 tick for every 10th call
 * }
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
