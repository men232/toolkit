import { assert } from '@/assert';

export type WrrItem<T> = {
  item: T;
  weight?: number;
};

type WrrItemWeighted = {
  item: any;
  weight: number;
};

/**
 * Creates a function that returns a weighted round-robin item from the provided array.
 *
 * The input array should contain objects with an `item` property and a `weight` property.
 * The `weight` determines the relative likelihood of selecting an item.
 * Items with higher weights will appear more frequently in the selection.
 *
 * If the `weight` property is missing or falsy, it defaults to `1`.
 * An empty array will result in a function that always returns `undefined`.
 *
 * @example
 * const getItem = weightedRoundRobin([
 *   { item: 'a', weight: 2 },
 *   { item: 'b', weight: 3 },
 *   { item: 'c' },
 * ]);
 *
 * console.log(getItem()); // 'a', 'b', or 'c'
 *
 * @group Array
 */
export function weightedRoundRobin<T = unknown>(arr: WrrItem<T>[]): () => T {
  assert.ok(arr.length > 0, 'Array must contain at least one item.');

  const instance = new WeightedRoundRobin(
    arr.map(v => ({
      item: v.item,
      weight: Math.min(v.weight ?? 1, 1),
    })),
  );

  return () => instance.nextItem();
}

const gcd = (a: number, b: number): number => (!b ? a : gcd(b, a % b));

class WeightedRoundRobin {
  currentIndex = -1;
  currentWeight = 0;
  maxWeight: number;
  gcdWeight: number;

  constructor(public items: WrrItemWeighted[]) {
    this.maxWeight = this._calculateMaxWeight();
    this.gcdWeight = this._calculateGCD();
  }

  _calculateGCD(): number {
    return this.items.reduce(
      (acc, curr) => gcd(acc, curr.weight),
      this.items[0].weight,
    );
  }

  _calculateMaxWeight(): number {
    return Math.max(...this.items.map(s => s.weight));
  }

  nextItem(): any {
    const n = this.items.length;
    while (true) {
      this.currentIndex = (this.currentIndex + 1) % n;
      if (this.currentIndex === 0) {
        this.currentWeight -= this.gcdWeight;
        if (this.currentWeight <= 0) {
          this.currentWeight = this.maxWeight;
        }
      }
      if (this.items[this.currentIndex].weight >= this.currentWeight) {
        return this.items[this.currentIndex].item;
      }
    }
  }
}
