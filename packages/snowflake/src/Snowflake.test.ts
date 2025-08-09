import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import {
  type DeconstructedSnowflake,
  MAX_INCREMENT,
  MAX_PROCESS_ID,
  MAX_WORKER_ID,
  Snowflake,
} from './Snowflake.js';

// 2020-01-01
const sampleEpoch = 1577836800000;

describe('Snowflake', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01T00:00:00.000+00:00'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  describe('processId', () => {
    test('GIVEN default THEN returns 1', () => {
      const snowflake = new Snowflake(sampleEpoch);
      expect(snowflake.processId).toBe(1);
    });

    test.each([15, 15n])(
      'GIVEN valid value (%s) THEN returns same value',
      value => {
        const snowflake = new Snowflake(sampleEpoch);
        snowflake.processId = value;
        expect(snowflake.processId).toBe(15);
      },
    );

    test.each([4200, 4200n])(
      'GIVEN out-of-range value (%s) THEN returns masked value',
      value => {
        const snowflake = new Snowflake(sampleEpoch);
        snowflake.processId = value;
        expect(snowflake.processId).toBe(8);
      },
    );
  });

  describe('increment', () => {
    test('GIVEN default THEN returns 1', () => {
      const snowflake = new Snowflake(sampleEpoch);
      expect(snowflake.increment).toBe(0);
    });

    test.each([15, 15n])(
      'GIVEN valid value (%s) THEN returns same value',
      value => {
        const snowflake = new Snowflake(sampleEpoch);
        snowflake.increment = value;
        expect(snowflake.increment).toBe(15);
      },
    );

    test.each([5000, 5000n])(
      'GIVEN out-of-range value (%s) THEN returns masked value',
      value => {
        const snowflake = new Snowflake(sampleEpoch);
        snowflake.increment = value;
        expect(snowflake.increment).toBe(904);
      },
    );
  });

  describe('workerId', () => {
    test('GIVEN default THEN returns 0n', () => {
      const snowflake = new Snowflake(sampleEpoch);
      expect(snowflake.workerId).toBe(0);
    });

    test.each([15, 15n])(
      'GIVEN valid value (%s) THEN returns same value',
      value => {
        const snowflake = new Snowflake(sampleEpoch);
        snowflake.workerId = value;
        expect(snowflake.workerId).toBe(15);
      },
    );

    test.each([4200, 4200n])(
      'GIVEN out-of-range value (%s) THEN returns masked value',
      value => {
        const snowflake = new Snowflake(sampleEpoch);
        snowflake.workerId = value;
        expect(snowflake.workerId).toBe(8);
      },
    );
  });

  describe('epoch', () => {
    test.each([
      sampleEpoch,
      Number(sampleEpoch),
      new Date(Number(sampleEpoch)),
    ])('GIVEN %s THEN returns 1577836800000n', value => {
      const snowflake = new Snowflake(value);
      expect(snowflake.epoch).toBe(sampleEpoch);
    });
  });

  describe('generate', () => {
    test('GIVEN timestamp as number THEN returns predefined snowflake', () => {
      const testId = '3971046231244804096';
      const testTimestamp = 2524608000000;
      const snowflake = new Snowflake(sampleEpoch);
      const snow = snowflake.generate(testTimestamp);

      expect(snow.toString()).toBe(testId);
    });

    test('GIVEN timestamp as Date THEN returns predefined snowflake', () => {
      const testId = '3971046231244804096';
      const testDate = new Date(2524608000000);
      const snowflake = new Snowflake(sampleEpoch);
      const snow = snowflake.generate(testDate);

      expect(snow.toString()).toBe(testId);
    });

    test('GIVEN empty object options THEN returns predefined snowflake', () => {
      const testId = '4096';
      const snowflake = new Snowflake(sampleEpoch);
      const snow = snowflake.generate();

      expect(snow.toString()).toBe(testId);
    });

    test('GIVEN no options THEN returns predefined snowflake', () => {
      const testId = '4096';
      const snowflake = new Snowflake(sampleEpoch);
      const snow = snowflake.generate();

      expect(snow.toString()).toBe(testId);
    });

    test('GIVEN timestamp as NaN THEN returns error', () => {
      const snowflake = new Snowflake(sampleEpoch);
      expect(() => snowflake.generate(NaN)).toThrowError(
        '"timestamp" argument must be a number',
      );
    });

    test('GIVEN timestamp as boolean THEN returns error', () => {
      const snowflake = new Snowflake(sampleEpoch);
      // @ts-expect-error testing fail case
      expect(() => snowflake.generate(true)).toThrowError(
        '"timestamp" argument must be a number',
      );
    });

    test('GIVEN multiple generate calls THEN generates distinct IDs', () => {
      const snowflake = new Snowflake(sampleEpoch);

      const arrayOf10Snowflakes = [
        snowflake.generate(),
        snowflake.generate(),
        snowflake.generate(),
        snowflake.generate(),
        snowflake.generate(),
        snowflake.generate(),
        snowflake.generate(),
        snowflake.generate(),
        snowflake.generate(),
        snowflake.generate(),
      ];

      const setOf10Snowflakes = new Set(arrayOf10Snowflakes);

      // Validate that there are no duplicate IDs
      expect(setOf10Snowflakes.size).toBe(arrayOf10Snowflakes.length);
    });

    test('GIVEN timestamp as Date and increment lower than 0n THEN returns predefined snowflake', () => {
      const testId = '8191';
      const snowflake = new Snowflake({ epoch: sampleEpoch, increment: -1n });
      const snow = snowflake.generate();

      expect(snow.toString()).toBe(testId);
    });

    test('GIVEN timestamp as Date and increment higher than 4095n THEN returns predefined snowflake', () => {
      const testId = '6196';
      const snowflake = new Snowflake(sampleEpoch);
      (snowflake as any)._increment = 2100;
      const snow = snowflake.generate();

      expect(snow.toString()).toBe(testId);
    });

    test('GIVEN timestamp as Date and increment higher than 4095n THEN returns predefined snowflake', () => {
      const testId = '5000';
      const snowflake = new Snowflake(sampleEpoch);
      (snowflake as any)._increment = 5000;
      const snow = snowflake.generate();

      expect(snow.toString()).toBe(testId);
    });

    test('GIVEN overflowing processId THEN generates ID with truncated processId', () => {
      const testId = '106496';
      const snowflake = new Snowflake({
        epoch: sampleEpoch,
        processId: 0b1111_1010n,
      });
      const snow = snowflake.generate();

      expect(snow.toString()).toBe(testId);
    });

    test('GIVEN overflowing default processId THEN generates ID with truncated processId', () => {
      const testId = '106496';
      const snowflake = new Snowflake(sampleEpoch);
      snowflake.processId = 0b1111_1010n;
      const snow = snowflake.generate();

      expect(snow.toString()).toBe(testId);
    });

    test('GIVEN overflowing workerId THEN generates ID with truncated workerId', () => {
      const testId = '3411968';
      const snowflake = new Snowflake({
        epoch: sampleEpoch,
        workerId: 0b1111_1010n,
      });
      const snow = snowflake.generate();

      expect(snow.toString()).toBe(testId);
    });

    test('GIVEN overflowing default workerId THEN generates ID with truncated workerId', () => {
      const testId = '3411968';
      const snowflake = new Snowflake(sampleEpoch);
      snowflake.workerId = 0b1111_1010n;
      const snow = snowflake.generate();

      expect(snow.toString()).toBe(testId);
    });

    describe('increment overrides', () => {
      test('GIVEN near-limit THEN it reaches limit', () => {
        const snowflake = new Snowflake(sampleEpoch);
        (snowflake as any)._increment = 4094;
        const snow = snowflake.generate();

        expect(snow.toString()).toBe('8190');
        expect((snowflake as any)._increment).toBe(4095);
      });

      test('GIVEN limit THEN it cycles to 0', () => {
        const snowflake = new Snowflake(sampleEpoch);
        (snowflake as any)._increment = 4095;
        const snow = snowflake.generate();

        expect(snow.toString()).toBe('8191');
        expect((snowflake as any)._increment).toBe(0);
      });

      test('GIVEN over-limit THEN it cycles to 0', () => {
        const snowflake = new Snowflake(sampleEpoch);
        (snowflake as any)._increment = 4096;
        const snow = snowflake.generate();

        expect(snow.toString()).toBe('4096');
        expect((snowflake as any)._increment).toBe(1);
      });

      test('GIVEN under-limit THEN it cycles to 0', () => {
        const snowflake = new Snowflake(sampleEpoch);
        (snowflake as any)._increment = -1;
        const snow = snowflake.generate();

        expect(snow.toString()).toBe('8191');
        expect((snowflake as any)._increment).toBe(0);
      });
    });
  });

  describe('deconstruct', () => {
    test('GIVEN id as string THEN returns data about snowflake', () => {
      const snowflake = new Snowflake(sampleEpoch);

      const flake = snowflake.deconstruct('3971046231244935169');

      expect(flake).toStrictEqual<DeconstructedSnowflake>({
        id: 3971046231244935169n,
        timestamp: 2524608000000,
        workerId: 1,
        processId: 1,
        increment: 1,
        epoch: 1577836800000,
      });
    });

    test('GIVEN id as bigint THEN returns data about snowflake', () => {
      const snowflake = new Snowflake(sampleEpoch);

      const flake = snowflake.deconstruct(3971046231244935168n);

      expect(flake).toStrictEqual<DeconstructedSnowflake>({
        id: 3971046231244935168n,
        timestamp: 2524608000000,
        workerId: 1,
        processId: 1,
        increment: 0,
        epoch: 1577836800000,
      });
    });
  });

  describe('decode', () => {
    test('GIVEN id as string THEN returns data about snowflake', () => {
      const snowflake = new Snowflake(sampleEpoch);

      const flake = snowflake.decode('3971046231244935169');

      expect(flake).toStrictEqual<DeconstructedSnowflake>({
        id: 3971046231244935169n,
        timestamp: 2524608000000,
        workerId: 1,
        processId: 1,
        increment: 1,
        epoch: 1577836800000,
      });
    });

    test('GIVEN id as bigint THEN returns data about snowflake', () => {
      const snowflake = new Snowflake(sampleEpoch);

      const flake = snowflake.decode(3971046231244935168n);

      expect(flake).toStrictEqual<DeconstructedSnowflake>({
        id: 3971046231244935168n,
        timestamp: 2524608000000,
        workerId: 1,
        processId: 1,
        increment: 0,
        epoch: 1577836800000,
      });
    });
  });

  describe('timestampFrom', () => {
    const snowflake = new Snowflake(sampleEpoch);

    test('GIVEN id as string THEN returns data about snowflake', () => {
      const timestamp = snowflake.timestampFrom('3971046231244935169');
      expect(timestamp).toBe(2524608000000);
    });

    test('222 GIVEN id as bigint THEN returns data about snowflake', () => {
      const timestamp = snowflake.deconstruct(3971046231244935168n);
      expect(timestamp.timestamp).toBe(2524608000000);
    });
  });

  describe('setHighest', () => {
    const snowflake = new Snowflake(sampleEpoch);

    test('should set most highest values', () => {
      snowflake.setHighest();

      expect(snowflake.increment).toBe(MAX_INCREMENT);
      expect(snowflake.workerId).toBe(MAX_WORKER_ID);
      expect(snowflake.processId).toBe(MAX_PROCESS_ID);
    });
  });

  describe('setLowest', () => {
    const snowflake = new Snowflake(sampleEpoch);

    test('should set most lowest values', () => {
      snowflake.setLowest();

      expect(snowflake.increment).toBe(0);
      expect(snowflake.workerId).toBe(0);
      expect(snowflake.processId).toBe(0);
    });
  });

  describe('withLowest', () => {
    const snowflake = new Snowflake(sampleEpoch);

    test('callback should be called with snowflake instance', () => {
      const mockFn = vi.fn();
      snowflake.withLowest(mockFn);

      expect(mockFn).toBeCalledWith(snowflake);
    });

    test('callback should returns same value', () => {
      const expectedResult = Symbol();
      const mockFn = vi.fn().mockReturnValue(expectedResult);
      snowflake.withLowest(mockFn);

      expect(mockFn).toHaveReturnedWith(expectedResult);
    });

    test('should rollback to the same generating values after usage', () => {
      snowflake.withLowest(v => v.generate());
      expect(snowflake.generate()).toBe(4096n);
    });

    test('should throw error when non function provided', () => {
      expect(() => snowflake.withLowest(null as any)).toThrowError(
        'function as first argument',
      );
    });

    test('should generate id with lowest values', () => {
      const id = snowflake.withLowest(v => v.generate());

      expect(id).toBe(0n);
    });
  });

  describe('withHighest', () => {
    const snowflake = new Snowflake(sampleEpoch);

    test('callback should be called with snowflake instance', () => {
      const mockFn = vi.fn();
      snowflake.withHighest(mockFn);

      expect(mockFn).toBeCalledWith(snowflake);
    });

    test('callback should returns same value', () => {
      const expectedResult = Symbol();
      const mockFn = vi.fn().mockReturnValue(expectedResult);
      snowflake.withHighest(mockFn);

      expect(mockFn).toHaveReturnedWith(expectedResult);
    });

    test('should rollback to the same generating values after usage', () => {
      snowflake.withHighest(v => v.generate());
      expect(snowflake.generate()).toBe(4096n);
    });

    test('should throw error when non function provided', () => {
      expect(() => snowflake.withHighest(null as any)).toThrowError(
        'function as first argument',
      );
    });

    test('should generate id with highest values', () => {
      const id = snowflake.withHighest(v => v.generate());

      expect(id).toBe(4194303n);
    });
  });

  describe.each([
    [String, String],
    [String, BigInt],
    [BigInt, String],
    [BigInt, BigInt],
  ])('compare', (ctorA, ctorB) => {
    test.each([
      [ctorA(737141877803057244n), ctorB(254360814063058944n), 1],
      [ctorA(1737141877803057244n), ctorB(254360814063058944n), 1],
      [ctorA(737141877803057244n), ctorB(737141877803057244n), 0],
      [ctorA(254360814063058944n), ctorB(737141877803057244n), -1],
      [ctorA(254360814063058944n), ctorB(1737141877803057244n), -1],
    ])('GIVEN %o and %o THEN returns %d', (a, b, expected) => {
      expect(Snowflake.compare(a, b)).toBe(expected);
    });
  });
});
