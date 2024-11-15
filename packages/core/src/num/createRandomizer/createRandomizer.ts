import { assert } from '@/assert';
import { getRandomInt } from '../getRandomInt';

export interface RandomizerOptions {
  min: number;
  max: number;
  pregenerateAmount: number;
  transform: (value: number) => number;
}

class Randomizer {
  private _pool: number[] = [];
  private _step: number = 0;
  private _min: number;
  private _max: number;
  private _pregenerateAmount: number;
  private _transform: (value: number) => number;

  constructor({ min, max, pregenerateAmount, transform }: RandomizerOptions) {
    this._min = min;
    this._max = max;
    this._pregenerateAmount = pregenerateAmount;
    this._transform = transform;
  }

  /**
   * Returns the current step of the randomizer.
   *
   * @returns {number} The current step.
   */
  getCurrentStep(): number {
    return this._step;
  }

  /**
   * Sets the current step of the randomizer.
   *
   * @param {number} value - The step to set.
   * @throws {Error} If the provided value is not a valid number or less than 0.
   */
  setCurrentStep(value: number) {
    assert.number(value, 'Current step must be an number');
    assert.ok(value >= 0, 'Current step must be getter or equal 0');
    this._step = value;
  }

  /**
   * Retrieves a random number either from the current step or a specific step if provided.
   *
   * @param {number} [fromStep] - The step from which to retrieve the random number (optional).
   * @returns {number} The random number at the current or specified step.
   */
  get(fromStep?: number): number {
    if (fromStep === undefined) {
      return this._lookup(this._step++);
    }

    return this._lookup(fromStep);
  }

  /**
   * Resets the current step to 0.
   */
  resetStep() {
    this._step = 0;
  }

  /**
   * Resets the random number pool, clearing and repopulating it with new random values.
   */
  resetPool() {
    const size = this._pregenerateAmount;

    this._pool = Array.from({ length: size });

    for (let step = 0; step < size; step++) {
      this._pool[step] = this._rand();
    }
  }

  private _rand(): number {
    return this._transform(getRandomInt(this._min, this._max));
  }

  private _lookup(step: number): number {
    if (this._pool[step] === undefined) {
      this._pool[step] = this._rand();
    }

    return this._pool[step]!;
  }
}

const noopTransform = (v: number) => v;

/**
 * Creates a random number generator with step control and optional transformation.
 * Allows caching of generated numbers for efficiency, with optional pregeneration and transformation.
 *
 * @param {RandomizerOptions} options - Configuration for the randomizer.
 * @param {number} options.min - Minimum value for the random number.
 * @param {number} options.max - Maximum value for the random number.
 * @param {number} [options.pregenerateAmount=100] - Number of random numbers to pregenerate and cache.
 * @param {(value: number) => number} [options.transform] - A function to transform the generated random number.
 * @returns {Randomizer} - The randomizer object with step control and number generation.
 *
 *
 * @example
 * // Basic usage of the randomizer
 * const randomizer = createRandomizer({
 *   min: 1,
 *   max: 10,
 *   pregenerateAmount: 5
 * });
 *
 * // Get the random number at the current step
 * console.log(randomizer.get()); // e.g., returns 3
 *
 * // Get the random number at a specific step
 * console.log(randomizer.get(2)); // e.g., returns 7
 *
 * // Get the current step
 * console.log(randomizer.getCurrentStep()); // returns the current step (e.g., 1)
 *
 * // Set the current step to 3
 * randomizer.setCurrentStep(3);
 *
 * // Get the random number at step 3
 * console.log(randomizer.get()); // returns the value for step 3
 *
 * @example
 * // Usage with a transformation function
 * const randomizerWithTransform = createRandomizer({
 *   min: 1,
 *   max: 10,
 *   pregenerateAmount: 5,
 *   transform: (value) => value * 2
 * });
 *
 * // Get a transformed random number at the current step
 * console.log(randomizerWithTransform.get()); // e.g., returns 6 (original value 3 transformed by multiplying by 2)
 *
 * // Reset the step to 0
 * randomizerWithTransform.resetStep();
 * console.log(randomizerWithTransform.get()); // returns the random number at step 0
 *
 * @group Numbers
 */
export function createRandomizer({
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  pregenerateAmount = 100,
  transform = noopTransform,
}: Partial<RandomizerOptions>): Randomizer {
  return new Randomizer({ min, max, pregenerateAmount, transform });
}
