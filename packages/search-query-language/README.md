# Search Query Language <!-- omit in toc -->

![license](https://img.shields.io/npm/l/query-parser) <!-- omit in toc -->
![npm version](https://img.shields.io/npm/v/query-parser) <!-- omit in toc -->
![npm bundle size](https://img.shields.io/bundlephobia/minzip/query-parser) <!-- omit in toc -->

Search Query Language is a lightweight utility that converts human-readable query strings into structured representations. It supports parsing expressions into an abstract syntax tree (AST) and transforming them into queries.

[Documentation](https://your-docs-link.com)

<!-- install placeholder -->

## ✨ Features

- **Expression Parsing**: Convert query strings into an AST for structured processing.
- **MongoDB Query Conversion**: Transform expressions into MongoDB-compatible query objects.
- **Flexible Syntax Support**: Supports comparison operators like `=`, `!=`, `>`, `<`, `>=`, `<=`.

## 🔍 Search Syntax

The following table lists the syntax that you can use to construct a query.

| Syntax | Usage                                       | Description                                  | Examples                                        |
| ------ | ------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| `=`    | `field="value"`                             | Exact match                                  | `name="andrew"`                                 |
| `!=`   | `field!="value"`                            | Not equal to                                 | `status!="active"`                              |
| `<`    | `field<value`                               | Less than                                    | `amount<5000`                                   |
| `<=`   | `field<=value`                              | Less than or equal to                        | `amount<=10000`                                 |
| `>`    | `field>value`                               | Greater than                                 | `created>1672531200`                            |
| `>=`   | `field>=value`                              | Greater than or equal to                     | `created>=1672531200`                           |
| `AND`  | `condition1 AND condition2`                 | Combine conditions (both must be true)       | `status="active" AND age>=18`                   |
| `OR`   | `condition1 OR condition2`                  | Combine conditions (either can be true)      | `status="stop" OR age>40`                       |
| `()`   | `(condition1 OR condition2) AND condition3` | Group conditions to control logic precedence | `(status="active" OR status="stop") AND age>18` |

## 📌 Notes

- The **left operand** must always be an identifier (e.g., a field name), while the **right operand** must always be a literal value (e.g., a string, number, or boolean).
- Support **comparison operators (`<`, `<=`, `>`, `>=`)**.
- Use **`AND`** and **`OR`** to combine conditions.
- Parentheses **`()`** help group conditions for better control over query logic.

## 🚀 Example: Minimal

```ts
import { parseToMongo } from '@andrew_l/search-query-language';

const clients = db.collection('clients');

// GET /clients?search="age>18"
app.get('/clients', async (req, res) => {
  const filter = parseToMongo(req.query.search);
  const items = await clients.find(filter).toArray();
  res.json(items);
});
```

## 🚀 Example: Usage MongoDB

```ts
import { parseToMongo } from '@andrew_l/search-query-language';

// GET /clients?search="active=true AND age>18"
app.get('/clients', async (req, res) => {
  const filter = parseToMongo(req.query.search, {
    transform: {
      _id: [MONGO_TRANSFORM.OBJECT_ID, MONGO_TRANSFORM.NOT_NULLABLE],
    },
  });

  const items = await db.collection('clients').find(filter).toArray();

  res.json(items);
});
```

## 🚀 Example: Usage Mongoose

```ts
import mongoose from 'mongoose';
import { parseToMongoose } from '@andrew_l/search-query-language';

const Client = mongoose.Model('Clients', new mongoose.Schema({
  email: String;
  active: Boolean;
}))

// GET /clients?search="email="andrew.io.dev@gmail.com" AND active=true"
app.get('/clients', async (req, res) => {
  const filter = parseToMongoose(Client, req.query.search);
  const items = await Client.find(filter).lean();

  res.json(items);
});
```
