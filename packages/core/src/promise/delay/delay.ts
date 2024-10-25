import { defer } from '../defer';
import { fastIdle } from '../fastIdle';

/**
 * Returns a provide that will be resolved in provided delay
 *
 * @group Promise
 */
export function delay(amount: 'tick' | number = 'tick') {
  const d = defer<void>();

  if (amount === 'tick') {
    fastIdle(d.resolve);
  } else {
    setTimeout(d.resolve, amount);
  }

  return d.promise;
}
