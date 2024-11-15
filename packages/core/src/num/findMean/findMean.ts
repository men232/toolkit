/**
 * A class that allows you to calculate the running mean (average) of a set of numbers.
 * It computes the average as new numbers are added and can also reset the progress.
 *
 * @example
 * // Basic usage to calculate running mean
 * const avg = findMean();
 * avg.push(1, 2, 3);
 * console.log(avg.value); // Output: 2 (average of 1, 2, 3)
 *
 * @example
 * // Reset the calculation with an initial value
 * const avg = findMean(10);
 * avg.push(20);
 * console.log(avg.value); // Output: 15 (average of 10, 20)
 * console.log(avg.count); // Output: 2 (two values added)
 */
class FindMean {
  #count: number = 0;
  #value: number = 0;

  constructor(initialValue?: number) {
    this.reset(initialValue);
  }

  /**
   * Resets the current progress of the mean calculation.
   * Optionally, you can pass an initial value to start the calculation.
   *
   * @param {number} [initialValue] - The initial value to start the mean calculation with.
   * @returns {FindMean} The current instance of the FindMean class for chaining.
   *
   * @example
   * const avg = findMean();
   * avg.push(2, 4);
   * avg.reset();
   * console.log(avg.value); // Output: 0
   */
  reset(initialValue?: number): FindMean {
    if (initialValue === undefined) {
      this.#count = 0;
      this.#value = 0;
    } else {
      this.#count = 1;
      this.#value = initialValue;
    }

    return this;
  }

  /**
   * Retrieves the current mean value (average).
   *
   * @returns {number} The current mean value.
   *
   * @example
   * const avg = findMean();
   * avg.push(5, 10);
   * console.log(avg.value); // Output: 7.5 (average of 5, 10)
   */
  get value(): number {
    return this.#value;
  }

  /**
   * Retrieves the count of numbers added so far.
   *
   * @returns {number} The count of numbers in the set.
   *
   * @example
   * const avg = findMean();
   * avg.push(10, 20);
   * console.log(avg.count); // Output: 2
   */
  get count(): number {
    return this.#count;
  }

  /**
   * Adds values to the set and updates the running mean.
   *
   * @param {...number} values - The values to add to the set.
   * @returns {FindMean} The current instance of the FindMean class for chaining.
   *
   * @example
   * const avg = findMean();
   * avg.push(1, 2, 3);
   * console.log(avg.value); // Output: 2 (average of 1, 2, 3)
   * console.log(avg.count); // Output: 3
   */
  push(...values: number[]): FindMean {
    for (const item of values) {
      this.#count++;
      this.#value += (item - this.#value) / this.#count;
    }

    return this;
  }
}

/**
 * Calculate the running mean (average) of a set of numbers.
 *
 * @param {number} [value] - An optional starting value for the mean calculation.
 * @returns {FindMean} A new instance of FindMean class to calculate running mean.
 *
 * @example
 * // Create a FindMean instance and add values to calculate the average
 * const avg = findMean();
 * avg.push(3, 3, 3.3);
 * console.log(avg.value); // Output: 3.1
 * console.log(avg.count); // Output: 3
 *
 * @group Numbers
 */
export function findMean(value?: number): FindMean {
  return new FindMean(value);
}
