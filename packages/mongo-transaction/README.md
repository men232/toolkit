# Mongo Transaction Toolkit

[![npm](https://img.shields.io/npm/v/@andrew_l/mongo-transaction?style=flat-square&color=f76707&labelColor=2b2f36&label=npm)](https://www.npmjs.com/package/@andrew_l/mongo-transaction)
[![license](https://img.shields.io/npm/l/@andrew_l/mongo-transaction?style=flat-square&color=f76707&labelColor=2b2f36)](https://github.com/men232/toolkit/blob/main/LICENSE)

Manages side effects in MongoDB transactions: runs them once across retries, undoes them on failure, emits after commit.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/mongo-transaction/) · [Changelog](./CHANGELOG.md) · [Toolkit](https://github.com/men232/toolkit) · [Issues](https://github.com/men232/toolkit/issues)

<!-- install placeholder -->

## ✨ Features

- **`onCommitted`** – runs once after the commit, never for a rolled back transaction.
- **`onRollback`** – runs once when the transaction finally fails, after effect cleanups.
- **`useTransactionEffect`** – a side effect with an undo, applied once across retries.
- **`useMongoSession`** – the current session anywhere in the call stack.
- **`onMongoSessionCommitted`** – after-commit callback for a plain `ClientSession`.
- Works with the `mongodb` driver and Mongoose 7/8.

## 🚀 Quick Start

```ts
import mongoose from 'mongoose';
import { onCommitted, withMongoTransaction } from '@andrew_l/mongo-transaction';

const confirmOrder = withMongoTransaction({
  connection: () => mongoose.connection.getClient(),
  async fn(session, orderId: string) {
    await Order.updateOne(
      { _id: orderId },
      { status: 'confirmed' },
      { session },
    );

    onCommitted(() => events.emit('order:confirmed', orderId));
  },
});

await confirmOrder('673b907dddd8ae43262aec0d');
```

## 🪝 Hooks

```ts
// Examples use Mongoose models and arbitrary services.
const getClient = () => mongoose.connection.getClient();
```

### `useMongoSession()`

No session threading through function arguments.

```ts
async function reserveStock(sku: string) {
  const session = useMongoSession() ?? undefined;

  await Stock.updateOne({ sku }, { $inc: { reserved: 1 } }, { session });
}

const placeOrder = withMongoTransaction(getClient, async (session, order) => {
  await Order.create([order], { session });
  await reserveStock(order.sku);
});
```

### `onCommitted()` / `onRollback()`

```ts
const payOrder = withMongoTransaction(getClient, async (session, orderId) => {
  await Order.updateOne({ _id: orderId }, { status: 'paid' }, { session });

  onCommitted(() => mailer.send(orderId, 'Payment received'));
  onRollback(() => metrics.increment('payments.failed'));
});
```

### `useTransactionEffect()`

An external call that must be undone if the transaction fails, and must not repeat when MongoDB retries the transaction.

```ts
const payOrder = withMongoTransaction(getClient, async (session, orderId) => {
  await useTransactionEffect(async () => {
    const chargeId = await stripe.charge(orderId);

    return () => stripe.refund(chargeId);
  });

  await Order.updateOne({ _id: orderId }, { status: 'paid' }, { session });
});
```

### `withTransaction()`

The same hooks without MongoDB.

```ts
const confirmOrder = withTransaction(async orderId => {
  await useTransactionEffect(async () => {
    const alertId = await alertService.create({
      title: `New order: ${orderId}`,
    });

    return () => alertService.removeById(alertId);
  });

  await useTransactionEffect(async () => {
    await statService.increment('orders', 1);

    return () => statService.decrement('orders', 1);
  });
});
```

### `onMongoSessionCommitted()`

After-commit callback without `withMongoTransaction`. Fires when the session ends.

```ts
const session = client.startSession();

await session.withTransaction(async () => {
  await Order.updateOne({ _id: orderId }, { status: 'confirmed' }, { session });

  onMongoSessionCommitted(session, () =>
    events.emit('order:confirmed', orderId),
  );
});

await session.endSession();
```

## ⏱️ When Hooks Run

| Hook                                          | When                                            | On retry                                        | Without commit                   |
| --------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | -------------------------------- |
| `useTransactionEffect(fn)`                    | Immediately                                     | Not applied again, unless `dependencies` change | Cleanup runs                     |
| `useTransactionEffect(fn, { flush: 'post' })` | After `fn` resolves, before `commitTransaction` | Not applied again, unless `dependencies` change | Cleanup runs                     |
| `onCommitted(fn)`                             | After `commitTransaction`                       | Once per transaction                            | Not called                       |
| `onRollback(fn)`                              | After the final failure, after cleanups         | Not called between attempts                     | Called once                      |
| `onMongoSessionCommitted(fn)`                 | When the session ends committed                 | Once **per attempt**, prefer `onCommitted`      | Not called, resolves `undefined` |

- An effect that throws rolls the transaction back.
- A hook that throws is logged and does not change the transaction result.
- Effect and hook errors go to the `logger` option (`noopLogger` from `@andrew_l/toolkit` silences them).
- A cleanup that throws is logged; `onRollback` hooks still run and `withMongoTransaction` / `withTransaction` reject with the original error. `withTransactionControlled().rollback()` rejects with the cleanup error and can be called again to retry only the failed cleanups.

## ⚠️ Cautions

- Always `await` `useTransactionEffect()`.
- Do not call hooks inside conditionals or loops.
- `flush: 'post'` runs **before** the commit. For after-commit side effects use `onCommitted()`.
- Mongoose: connect before the client is used, `withMongoTransaction(() => mongoose.connection.getClient())`.

## 🤔 Why Use This Package?

1. **Safe Retries:** MongoDB retries can cause duplicate actions if not handled properly. This package ensures all side effects are idempotent and reversible.
2. **Streamlined Rollbacks:** Simplifies managing complex operations by integrating rollback mechanisms into your transaction workflow.
3. **Ease of Use:** API design mimics React's hooks, making it intuitive for developers familiar with React patterns.
