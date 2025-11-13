/* eslint-disable no-restricted-globals */
import { isNode } from '@/is.js';
import { BrowserAssertionError } from '../errors/BrowserAssertionError.js';

let AssertionError = BrowserAssertionError;

if (isNode()) {
  try {
    // Use require dynamically to avoid Rollup static analysis errors
    // (works at runtime, but Rollup won’t bundle Node built-ins)
    const assert = require('node:assert');
    if (assert.AssertionError) {
      AssertionError = assert.AssertionError;
    }
  } catch {
    // silently ignore if unavailable
  }
}

export { AssertionError };
