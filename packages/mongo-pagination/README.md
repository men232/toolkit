# Mongo Pagination Toolkit <!-- omit in toc -->

![license](https://img.shields.io/npm/l/%40andrew_l%2Fmongo-pagination) <!-- omit in toc -->
![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fmongo-pagination) <!-- omit in toc -->
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Fmongo-pagination) <!-- omit in toc -->

This package provides an efficient and customizable way to handle pagination for MongoDB and Mongoose queries. It simplifies working with large datasets by enabling cursor pagination, handling sorting, and managing tokens for navigating between pages.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/mongo-pagination/)

<!-- install placeholder -->

## ✨ Features

- **Pagination for MongoDB and Mongoose**: Easily add pagination capabilities to both MongoDB and Mongoose queries.
- **Customizable Pagination Logic**: Control pagination behavior with options such as sorting direction and pagination fields.
- **Token-based Navigation**: Uses tokens to handle page navigation without relying on traditional offsets.
- **TypeScript Support**: Full TypeScript support for type safety and autocompletion.
- **Flexible Sorting**: Supports sorting by multiple fields with ascending or descending order.
- **Easy Integration**: Simple to integrate with existing MongoDB or Mongoose-based applications.

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

1. **Handles Large Datasets Efficiently:** Pagination helps you manage large result sets without loading all data at once, improving performance.
2. **Token-based Navigation:** Unlike traditional offset-based pagination, this package uses tokens for more reliable navigation between pages, especially for dynamic or changing datasets.
3. **MongoDB and Mongoose Support:** Whether you're working with raw MongoDB queries or Mongoose models, this package supports both seamlessly.
4. **Customizable and Flexible:** The pagination logic can be tailored to your specific requirements, such as custom sorting or pre/post query hooks.
5. **Type Safety:** With TypeScript support, you'll get strong typing, better autocompletion, and fewer errors when working with pagination in your project.
