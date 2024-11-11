class FindMean {
  #count: number = 0;
  #value: number = 0;

  constructor(initialValue?: number) {
    this.reset(initialValue);
  }

  /**
   * Drop current progress
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
   * Returns the average of the previously added numbers in the set.
   */
  get value(): number {
    return this.#value;
  }

  /**
   * Returns the count of numbers in the set.
   */
  get count(): number {
    return this.#count;
  }

  /**
   * Adds the value to the set.
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
 * Finding the average of an unknown amount of numbers
 *
 * @example
 * const avg = findMean()
 *   .push(3)
 *   .push(3)
 *   .push(3.3);
 *
 * console.log(avg.value); // ((3 + 3 + 3.3) / 3) = 3.1
 * console.log(avg.count); // 3
 *
 * @group Numbers
 */
export function findMean(value?: number): FindMean {
  return new FindMean(value);
}
