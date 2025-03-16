import { describe, expect, it } from 'vitest';
import { parseToMongo } from './parseToMongo';

describe('parseToMongo', () => {
  it('should handle simple comparing', () => {
    expect(parseToMongo('name = "andrew"')).toStrictEqual({
      name: 'andrew',
    });
  });

  it('should handle comparing with logical operators', () => {
    expect(parseToMongo('name = "andrew" OR age > 5')).toStrictEqual({
      $or: [{ name: 'andrew' }, { age: { $gt: 5 } }],
    });
  });

  it('should handle comparing with complex logical operators', () => {
    expect(
      parseToMongo('(role = "ADMIN" AND name = "andrew") OR age >= 18'),
    ).toStrictEqual({
      $or: [
        { $and: [{ role: 'ADMIN' }, { name: 'andrew' }] },
        { age: { $gte: 18 } },
      ],
    });
  });

  it('should handle comparing with same logical operators', () => {
    expect(
      parseToMongo('role = "ADMIN" OR name = "andrew" OR age >= 18'),
    ).toStrictEqual({
      $or: [{ role: 'ADMIN' }, { name: 'andrew' }, { age: { $gte: 18 } }],
    });
  });
});
