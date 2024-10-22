import { assert } from '@/assert';

export function assertCapacity(value: unknown): asserts value is number {
  assert.number(value, 'capacity must be a number');
  assert.ok(value > 0, 'capacity must be more then 0.');
}
