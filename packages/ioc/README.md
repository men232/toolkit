# Inversion of Control (IoC) Toolkit <!-- omit in toc -->

![license](https://img.shields.io/npm/l/%40andrew_l%2Fioc) <!-- omit in toc -->
![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fioc) <!-- omit in toc -->
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Fioc) <!-- omit in toc -->

A simple and flexible Inversion of Control (IoC) container to help set up and manage services in your application. This toolkit automates the process of importing and registering services, ensuring that dependencies are injected properly before running your application code.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/ioc/)

<!-- install placeholder -->

## ✨ Features

- **Service Container**: Centralized place for managing service instances and dependencies.
- **Automatic Import**: Auto-imports `*.service.js` files from the specified directories for service registration.
- **TypeScript Support**: Generates types for services for better developer experience in TypeScript.
- **Flexible Setup**: Easily configure paths, patterns, and output types for IoC setup.

## 🚀 Setup Example

```js
import { ServiceContainer } from '@andrew_l/ioc';

await ServiceContainer.setup({
  pathRoot: process.cwd(), // Root directory of your services
  autoImportPatterns: ['./services/*/**/*.service.{js,mjs}'], // Pattern to automatically import service files
  typeOutput: './ioc.d.ts', // Path to output generated types
  generateTypes: true, // Enable type generation for TypeScript
});

// Your application code follows
```

## 🚀 Usage Example

### Service Definition

```js
// user.service.js
import { ServiceContainer } from '@andrew_l/ioc';

export class UserService {
  async create() {
    // Service logic for creating a user
    // TODO: Implement the user creation logic
  }
}

// Register the UserService in the container
ServiceContainer.set('UserService', UserService);
```

### Controller Using IoC

```js
// user.controller.js
import { ioc } from '@andrew_l/ioc';

export function createUser() {
	const UserService = ioc('UserService');

	ctx.body = await UserService.create(ctx.request.body);
}
```

## 🤔 Why Use This Package?

1. **Centralized Service Management:** Automatically manage and resolve service dependencies, making it easier to organize and scale your application.
2. **Auto-import Services:** Automatically imports services from your specified directory, reducing boilerplate and manual imports.
3. **Flexible and Customizable:** Easily configure paths and types, making it adaptable to various project structures.
4. **Improved Developer Experience:** Supports TypeScript for type generation.
