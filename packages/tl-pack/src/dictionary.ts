export function createDictionary(values?: string[]): Dictionary {
  return new Dictionary(values);
}

export class Dictionary {
  private _count = 0;
  private _wordToIndex: Map<string, number>;
  private _words: string[];
  private _offset: number;

  constructor(values?: string[], offset = 0) {
    this._words = [];
    this._wordToIndex = new Map();
    this._offset = offset;

    if (Array.isArray(values) && values.length) {
      values.forEach(word => {
        if (this._wordToIndex!.has(word)) return;

        this._wordToIndex.set(word, this._count++);
        this._words.push(word);
      });
    }
  }

  get size(): number {
    return this._count;
  }

  /**
   * Returns inserted index or nothing
   */
  maybeInsert(word: string): number | null {
    if (this._wordToIndex.has(word)) return null;

    this._wordToIndex.set(word, this._count++);
    this._words.push(word);

    return this._count + this._offset;
  }

  getValue(index: number): string | null {
    return this._words[index - this._offset] ?? null;
  }

  getIndex(value: string): number | null {
    const idx = this._wordToIndex.get(value);

    if (idx === undefined) {
      return null;
    }

    return idx + this._offset;
  }

  hasValue(value: string): boolean {
    return this._wordToIndex.has(value);
  }

  hasIndex(index: number): boolean {
    return this._words[index - this._offset] !== undefined;
  }
}
