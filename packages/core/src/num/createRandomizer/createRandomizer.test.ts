import { describe, expect, it } from 'vitest';
import { createRandomizer } from './createRandomizer'; // Replace with the correct import path

describe('createRandomizer', () => {
  it('should generate random numbers within the specified range', () => {
    const randomizer = createRandomizer({ min: 1, max: 10 });

    // Get random numbers and check if they fall within the min and max range
    for (let i = 0; i < 10; i++) {
      const num = randomizer.get();
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10);
    }
  });

  it('should respect the pregenerateAmount option', () => {
    const randomizer = createRandomizer({
      min: 1,
      max: 10,
      pregenerateAmount: 5,
    });

    // The pool should have 5 pregenerated numbers
    expect(randomizer.get()).toBeDefined();
    expect(randomizer.get()).toBeDefined();
    expect(randomizer.get()).toBeDefined();
    expect(randomizer.get()).toBeDefined();
    expect(randomizer.get()).toBeDefined();
  });

  it('should transform the random number if a transform function is provided', () => {
    const randomizer = createRandomizer({
      min: 1,
      max: 10,
      transform: value => value * 2,
    });

    const num = randomizer.get();
    // Expect the random number to be doubled
    expect(num).toBeGreaterThanOrEqual(2);
    expect(num).toBeLessThanOrEqual(20);
  });

  it('should correctly handle step management', () => {
    const randomizer = createRandomizer({ min: 1, max: 100 });

    // Test the `getCurrentStep` method
    expect(randomizer.getCurrentStep()).toBe(0);

    // Test the `setCurrentStep` method
    randomizer.setCurrentStep(5);
    expect(randomizer.getCurrentStep()).toBe(5);
    randomizer.resetStep();

    // Test the `get` method with step control
    const step5Value = randomizer.get(5);
    expect(step5Value).toBeDefined();
    expect(randomizer.getCurrentStep()).toBe(0);

    // Test the `resetStep` method
    randomizer.resetStep();
    expect(randomizer.getCurrentStep()).toBe(0);
  });

  it('should handle undefined fromStep argument in get() method', () => {
    const randomizer = createRandomizer({ min: 1, max: 100 });

    // Without passing `fromStep`, it should increment the current step
    randomizer.get();
    randomizer.get();
    expect(randomizer.getCurrentStep()).toBe(2);
  });

  it('should handle invalid fromStep gracefully', () => {
    const randomizer = createRandomizer({ min: 1, max: 100 });

    expect(randomizer.get(-5)).toBeDefined();
    expect(randomizer.getCurrentStep()).toBe(0);
  });

  it('should returns same values for same steps', () => {
    const randomizer = createRandomizer({
      min: 1,
      max: 100,
      pregenerateAmount: 5,
    });

    const values = [
      randomizer.get(),
      randomizer.get(),
      randomizer.get(),
      randomizer.get(),
      randomizer.get(),
    ];

    randomizer.resetStep();

    const valuesAfterReset = [
      randomizer.get(),
      randomizer.get(),
      randomizer.get(),
      randomizer.get(),
      randomizer.get(),
    ];

    expect(values).toStrictEqual(valuesAfterReset);
  });
});
