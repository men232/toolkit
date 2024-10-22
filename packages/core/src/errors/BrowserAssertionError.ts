export class BrowserAssertionError extends Error {
  /**
   * Set to the `actual` argument for methods such as {@link assert.strictEqual()}.
   */
  actual: unknown;
  /**
   * Set to the `expected` argument for methods such as {@link assert.strictEqual()}.
   */
  expected: unknown;
  /**
   * Set to the passed in operator value.
   */
  operator: string;
  /**
   * Indicates if the message was auto-generated (`true`) or not.
   */
  generatedMessage: boolean;
  /**
   * Value is always `ERR_ASSERTION` to show that the error is an assertion error.
   */
  code: 'ERR_ASSERTION';

  constructor(options?: {
    /** If provided, the error message is set to this value. */
    message?: string | undefined;
    /** The `actual` property on the error instance. */
    actual?: unknown | undefined;
    /** The `expected` property on the error instance. */
    expected?: unknown | undefined;
    /** The `operator` property on the error instance. */
    operator?: string | undefined;
    /** If provided, the generated stack trace omits frames before this function. */
    stackStartFn?: Function | undefined;
  }) {
    super(options?.message);
    this.actual = options?.actual;
    this.expected = options?.expected;
    this.operator = options?.operator ?? 'none';
    this.generatedMessage = false;
    this.code = 'ERR_ASSERTION';
  }
}
