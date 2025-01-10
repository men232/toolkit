let AssertionError: any;

(async () => {
  AssertionError = (globalThis as any).window
    ? await import('../errors/BrowserAssertionError').then(
        r => r.BrowserAssertionError,
      )
    : await import('node:assert').then(r => r.AssertionError);
})();

export { AssertionError };
