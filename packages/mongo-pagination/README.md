# Mongo Pagination Toolkit

![license](https://img.shields.io/npm/l/%40andrew_l%2Fmongo-pagination)
![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fmongo-pagination)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Fmongo-pagination)

This package provides an efficient and customizable way to handle pagination for MongoDB and Mongoose queries. It simplifies working with large datasets by enabling cursor pagination, handling sorting, and managing tokens for navigating between pages.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/mongo-pagination/)

<!-- install placeholder -->

## ✨ Features

- **MongoDB & Mongoose Support**: Add pagination to queries with ease.
- **Token-based Navigation**: Reliable page transitions without offsets.
- **Customizable Sorting**: Sort by multiple fields and directions.
- **TypeScript Ready**: Built-in type safety and autocompletion.
- **Lightweight Integration**: Simple setup for existing applications.

## 🚀 Example: Usage with Mongoose

```js
import { withMongoosePagination } from '@andrew_l/mongo-pagination';
import mongoose from 'mongoose';

async function paginateMongoose() {
  const User = mongoose.model(
    'User',
    new mongoose.Schema({ name: String, status: String }),
  );
  const query = User.find({ status: 'active' });

  const paginator = withMongoosePagination(query, {
    paginationFields: ['_id'],
  });

  const result = await paginator.exec();
  console.log(result.items); // Logs the items for the current page
  console.log(result.metadata); // Logs pagination metadata
}
```

## 🚀 Example: Mongoose Plugin

```js
import setupPlugin from '@andrew_l/mongo-pagination/mongoose-7'; // or 8

import mongoose from 'mongoose';

setupPlugin(mongoose);

async function paginateMongoose() {
  const User = mongoose.model(
    'User',
    new mongoose.Schema({ name: String, status: String }),
  );

  const result = await User.find({ status: 'active' }).paginator();

  console.log(result.items); // Logs the items for the current page
  console.log(result.metadata); // Logs pagination metadata

  const nextPage = await User.find().paginatorNext(result.metadata.next);

  console.log(nextPage.items); // Logs the items for the second page
  console.log(nextPage.metadata);
}
```

## 🚀 Example: Usage with MongoDB

```js
import { withMongoPagination } from '@andrew_l/mongo-pagination';
import { MongoClient } from 'mongodb';

async function paginateMongoDB() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();

  const db = client.db('exampleDb');
  const collection = db.collection('exampleCollection');

  const cursor = collection.find({ status: 'active' });

  const paginator = withMongoPagination(cursor, {
    paginationFields: ['_id'],
  });

  const result = await paginator.exec();
  console.log(result.items); // Logs the items for the current page
  console.log(result.metadata); // Logs pagination metadata
}
```

## 🤔 Why Use This Package?

1. **Efficient for Large Datasets:** Loads only the necessary data.
2. **Token-based Pagination:** Ideal for dynamic datasets.
3. **Flexible & Customizable:** Adaptable to your requirements.
4. **TypeScript Support:** Minimized errors, better productivity.
