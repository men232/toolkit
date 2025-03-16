import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { parseToMongoose } from './parseToMongoose';

function s(schema: Record<string, any>, input: string): Record<string, any> {
  return parseToMongoose(new mongoose.Schema(schema), input);
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
  describe('should handle number', () => {
    makeValidationTest(Number, {
      valid: [['18', 18]],
      invalid: ['"18"', 'false', 'true'],
    });
  });

  describe('should handle Decimal128', () => {
    makeValidationTest(mongoose.Types.Decimal128, {
      valid: [['18', 18]],
      invalid: ['"18"', 'false', 'true'],
    });
  });

  describe('should handle string', () => {
    makeValidationTest(String, {
      valid: [['"Andrew"', 'Andrew']],
      invalid: ['123', 'true', 'false'],
    });
  });

  describe('should handle date', () => {
    makeValidationTest(Date, {
      valid: [
        ['"2025-03-16T20:25:52.946Z"', new Date('2025-03-16T20:25:52.946Z')],
        ['1742156840247', new Date(1742156840247)],
      ],
      invalid: ['"abc"', 'true', 'false'],
    });
  });

  describe('should handle boolean', () => {
    makeValidationTest(Boolean, {
      valid: [
        ['true', true],
        ['false', false],
      ],
      invalid: ['"abc"', '123'],
    });
  });

  describe('should handle UUID', () => {
    makeValidationTest(mongoose.Types.UUID, {
      valid: [['"00000-0000-000"', '00000-0000-000']],
      invalid: ['123', 'false', 'true'],
    });
  });
});
