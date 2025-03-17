import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import type { ParseToMongoOptions } from './parseToMongo';
import { MONGO_TRANSFORM, parseToMongoose } from './parseToMongoose';

function s(
  schema: Record<string, any>,
  input: string,
  opts?: ParseToMongoOptions,
): Record<string, any> {
  return parseToMongoose(new mongoose.Schema(schema), input, opts);
}

function makeValidationTest(
  type: unknown,
  { valid, invalid }: { valid: [string, unknown][]; invalid: string[] },
) {
  valid.unshift(['null', null]);

  for (const [value, result] of valid) {
    it(`valid variant = ${value}`, () => {
      expect(
        s({ __test_valid: type }, `__test_valid = ${value}`),
      ).toStrictEqual({
        __test_valid: result,
      });
    });
  }

  for (const invalidValue of invalid) {
    it(`invalid variant = ${invalidValue}`, () => {
      expect(() =>
        s({ __test_invalid: type }, `__test_invalid = ${invalidValue}`),
      ).toThrowError('The search key "__test_invalid" is not valid');
    });
  }
}

describe('parseToMongoose', () => {
  describe('options.allowedKeys', () => {
    it('should default pre-filled with schema paths', () => {
      expect(s({ name: String }, 'name = "andrew"')).toBeTruthy();

      expect(() => s({ name: String }, 'age > 18')).toThrowError(
        'The search key "age" is not allowed.',
      );
    });

    it('should be overridable', () => {
      expect(
        s({ name: String }, 'age > 18', { allowedKeys: ['age'] }),
      ).toStrictEqual({ age: { $gt: 18 } });
    });
  });

  describe('options.transform', () => {
    it('should accept extensions', () => {
      expect(s({ a: Number }, 'a=null')).toStrictEqual({ a: null });
      expect(() =>
        s({ a: Number }, 'a=null', {
          transform: { a: MONGO_TRANSFORM.NOT_NULLABLE },
        }),
      ).toThrowError('The search key "a" cannot be null.');
    });
  });

  describe('validation from schema', () => {
    describe('Number', () => {
      makeValidationTest(Number, {
        valid: [['18', 18]],
        invalid: ['"18"', 'false', 'true'],
      });
    });

    describe('Decimal128', () => {
      makeValidationTest(mongoose.Types.Decimal128, {
        valid: [['18', 18]],
        invalid: ['"18"', 'false', 'true'],
      });
    });

    describe('String', () => {
      makeValidationTest(String, {
        valid: [['"Andrew"', 'Andrew']],
        invalid: ['123', 'true', 'false'],
      });
    });

    describe('Date', () => {
      makeValidationTest(Date, {
        valid: [
          ['"2025-03-16T20:25:52.946Z"', new Date('2025-03-16T20:25:52.946Z')],
          ['1742156840247', new Date(1742156840247)],
        ],
        invalid: ['"abc"', 'true', 'false'],
      });
    });

    describe('Boolean', () => {
      makeValidationTest(Boolean, {
        valid: [
          ['true', true],
          ['false', false],
        ],
        invalid: ['"abc"', '123'],
      });
    });

    describe('UUID', () => {
      makeValidationTest(mongoose.Types.UUID, {
        valid: [['"00000-0000-000"', '00000-0000-000']],
        invalid: ['123', 'false', 'true'],
      });
    });
  });
});
