# Description <!-- omit in toc -->

![license](https://img.shields.io/npm/l/%40andrew_l%2Fmongo-transaction) ![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fmongo-transaction) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Fmongo-transaction) <!-- omit in toc -->

This package addresses the issue where MongoDB's `session.withTransaction` may call the provided function multiple times if it retries operations.

Often, you may want side effects in this function that can be easily canceled if needed.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/mongo-transaction/)

# ⚠️ Cautions

- Note: If your effects throw an error, the transaction will roll back, except for `flush: post` effects.
- Always await your `useTransactionEffect()`.
- Avoid using `useTransactionEffect()` in nested blocks (e.g., inside conditions); it should be called in the main function block, similar to React hooks.

# Example

This example demonstrates how to leverage the transaction context to automatically roll back actions if an error occurs during the transaction.

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

  throw new Error('Cancel transaction.');
});
```

# Example (Mongo)

In the example below, we show how to remove a previously created alert if the transaction fails, while also ensuring that duplicate alerts are not triggered when MongoDB retries the transaction. This leverages the transaction context to manage side effects and handle retries effectively.

```js
import mongoose from 'mongoose';
import {
  useTransactionEffect,
  withMongoTransaction,
} from '@andrew_l/mongo-transaction';

const executeTransaction = withMongoTransaction({
  connection: () => mongoose.connection,
  async fn(session) {
    const orders = mongoose.connection.collection('orders');

    const { modifiedCount } = await orders.updateMany(
      { status: 'pending' },
      { $set: { status: 'confirmed' } },
      { session },
    );

    await useTransactionEffect(
      async () => {
        // Publish alert immediately
        const alertId = await AlertService.publish({
          text: `${modifiedCount} orders confirmed.`,
        });

        // Remove alert if transaction fails
        return () => AlertService.removeById(alertId);
      },
      { flush: 'pre' }, // Use `post` to execute the effect after the transaction function.
    );
  },
});

executeTransaction().catch(console.error);
```
