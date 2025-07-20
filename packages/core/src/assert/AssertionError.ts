import { BrowserAssertionError } from '../errors/BrowserAssertionError.js';

let AssertionError = BrowserAssertionError;

if (!(globalThis as any).window) {
  import('node:assert')
    .then(r => (AssertionError = r.AssertionError))
    .catch(() => {});
}

export { AssertionError };
