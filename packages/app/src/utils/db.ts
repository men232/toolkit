import { EJSON } from '@andrew_l/toolkit';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DB_PATH = path.join(os.tmpdir(), 'vrun.json');

class TempDB {
  private _storage = new Map();
  private _dirty: boolean = false;

  constructor(public filepath: string) {}

  get isDirty() {
    return this._dirty;
  }

  get<T>(key: string): T | undefined {
    return this._storage.get(key);
  }

  set(key: string, value: unknown) {
    this._storage.set(key, value);
    this._dirty = true;
  }

  save() {
    if (!this._dirty) return;
    const data = EJSON.stringify(Array.from(this._storage.entries()));
    fs.writeFileSync(this.filepath, data);
    this._dirty = false;
  }

  load(): boolean {
    try {
      const data = EJSON.parse(fs.readFileSync(this.filepath, 'utf-8'));

      for (const [key, value] of data) {
        this._storage.set(key, value);
      }

      return true;
    } catch (_) {
      return false;
    }
  }
}

export const db = new TempDB(DB_PATH);

db.load();
