# Mongo Transaction Toolkit

[![npm version][npm-version-src]][npm-version-href]
![license][license-src]

This package solves a common issue with MongoDB's `session.withTransaction`, where the provided function might be executed multiple times due to retries. This can create challenges for managing side effects that need to be rolled back consistently during transaction retries or failures.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/mongo-transaction/)

<!-- install placeholder -->

## ✨ Features

- **Transactional Effects:** Easily register actions to be rolled back if a transaction fails.
- **Retry-Safe Operations:** Avoid duplicating side effects during transaction retries.
- **Cleanup Support:** Ensure that all registered effects are undone if the transaction is canceled.

## ⚠️ Cautions

To ensure smooth usage, please keep the following in mind:

- **Error Handling:** If your effects throw an error, the transaction will roll back.
- **Calls:** Always `await` the promises returned by `useTransactionEffect()`.
- **Placement:** Do not use `useTransactionEffect()` inside nested blocks like conditionals or loops.
- **Mongoose:** Ensure the connection is established before using the client: `withMongoTransaction(() => mongoose.connection.getClient())`.

## 🚀 Example: Automatic Rollback of Side Effects

This example demonstrates how to use the transaction context to automatically manage side effects and roll back actions if an error occurs during execution.

```js
const confirmOrder = withTransaction(async orderId => {
  // Register Alert
  await useTransactionEffect(async () => {
    const alertId = await alertService.create({
      title: 'New Order: ' + orderId,
    });

    return () => alertService.removeById(alertId);
  });

  // Update Statistics
  await useTransactionEffect(async () => {
    await statService.increment('orders_amount', 1);

    return () => statService.decrement('orders_amount', 1);
  });

  throw new Error('Oops.');
});
```

## 🚀 Example: Usage MongoDB

Below is an example demonstrating how to use `withMongoTransaction` to manage side effects like creating and removing alerts during a transaction. If the transaction fails, the created alert is automatically removed. Additionally, the logic ensures duplicate alerts are not created during MongoDB's retry mechanism.

```js
import mongoose from 'mongoose';
import {
  useTransactionEffect,
  withMongoTransaction,
} from '@andrew_l/mongo-transaction';

const confirmOrder = withMongoTransaction({
  connection: () => mongoose.connection.getClient(),
  async fn(session) {
    // Register an alert as a transactional effect
    await useTransactionEffect(async () => {
      const alertId = await alertService.create({
        title: `Order Confirmed: ${orderId}`,
      });

      // Define cleanup logic to remove the alert on rollback
      return () => alertService.removeById(alertId);
    });

    // Simulate order processing (e.g., database updates)
    await db
      .collection('orders')
      .updateOne({ orderId }, { $set: { status: 'confirmed' } }, { session });

    // Simulate an error to test rollback
    throw new Error('Simulated transaction failure');
  },
});

confirmOrder('673b907dddd8ae43262aec0d').catch(console.error);
```

## 🤔 Why Use This Package?

1. **Safe Retries:** MongoDB retries can cause duplicate actions if not handled properly. This package ensures all side effects are idempotent and reversible.
2. **Streamlined Rollbacks:** Simplifies managing complex operations by integrating rollback mechanisms into your transaction workflow.
3. **Ease of Use:** API design mimics React's hooks, making it intuitive for developers familiar with React patterns.

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@andrew_l/mongo-transaction?style=flat
[npm-version-href]: https://npmjs.com/package/@andrew_l/mongo-transaction
[license-src]: https://img.shields.io/npm/l/@andrew_l/mongo-transaction?style=flat
