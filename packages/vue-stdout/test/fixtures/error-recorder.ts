/**
 * A module-level sink so `ErrorBoundarySfc.vue` can report what its
 * `<ErrorBoundary @error>` listener received without the fixture needing a
 * callback prop of its own -- which would defeat the point of the test.
 */
export const caughtErrors: Error[] = [];

export function recordError(error: Error): void {
  caughtErrors.push(error);
}
