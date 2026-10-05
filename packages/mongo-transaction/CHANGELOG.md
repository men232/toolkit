# Changelog

## 0.5.2

### Bug Fixes

- `onMongoSessionCommitted` called `fn` after a rollback or abort. Cause: the driver's deprecated `Transaction.isCommitted` is also `true` for `TRANSACTION_ABORTED`. Now checks `transaction.state`.
- `onRollback` advanced the `onCommitted` cursor instead of its own:
  - several `onRollback` in one transaction kept only the last hook;
  - `onRollback` before `onCommitted` left an empty slot, so the commit step rejected with `TypeError` after the data was committed (all wrappers), and some `onCommitted` hooks did not run.
- `useTransactionEffect` did not advance its cursor on retry when dependencies were unchanged, so a later effect could take its slot: its cleanup ran on a committed transaction, the later effect was applied twice.
- A failed effect cleanup replaced the transaction error and skipped `onRollback` hooks. `withMongoTransaction` / `withTransaction` now reject with the original error, the hooks run, and the cleanup error is logged. `withTransactionControlled().rollback()` still rejects with the cleanup error; calling it again retries only the failed cleanups without re-running the hooks.

### Changes

- Errors thrown by `onCommitted` / `onRollback` hooks are logged at `error` level instead of being swallowed. The transaction result is unchanged.
- New `logger` option on `withMongoTransaction`, `withTransaction` and `withTransactionControlled` receives effect and hook errors.
- Effect errors are no longer suppressed under `NODE_ENV=test`. Tests where an effect throws print to the console unless `logger: noopLogger` is passed.

### Documentation

- README rewritten: an example per hook, `useMongoSession` in a nested function, a table of when each hook runs relative to `commitTransaction` and retries. `flush: 'post'` runs before the commit.
- JSDoc for `TransactionControlled` members and the `logger` option.

### What to check

- `onMongoSessionCommitted` used for side effects that must not run on rollback: before 0.5.2 they ran.
- `onRollback` registered before `onCommitted`: the caller may have received an error for a committed transaction.
- An effect with default dependencies followed by an effect whose dependencies change on retry: the first effect's cleanup could run on a committed transaction.
