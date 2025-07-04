# Graceful Shutdown Toolkit

[![npm version][npm-version-src]][npm-version-href]
![license][license-src]

This package helps gracefully shut down applications by managing dependencies during the shutdown process. It ensures that important cleanup tasks, such as closing database connections or stopping services, are completed before the application exits.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/graceful/)

<!-- install placeholder -->

## 🚀 Example Usage

The following example shows how to use the package to perform a graceful shutdown for a MongoDB connection and an HTTP server:

```js
import { onShutdown } from '@andrew_l/graceful';

// Gracefully shutdown MongoDB connection
onShutdown('mongoose', ['http-server'], async () => {
  console.info('Graceful: mongodb connection.');
  await mongoose.disconnect();
});

// Gracefully shutdown HTTP server
onShutdown('http-server', async () => {
  console.info('Graceful: http server.');
  await httpServer.close();
});
```

## 🤔 Why Use This Package?

1. **Clean Shutdown:** Ensures your application cleans up resources like database connections, open files, or server instances before exiting.
2. **Orderly Cleanup:** Allows you to manage dependencies during shutdown, ensuring each resource is shut down in the proper order.
3. **Customizable:** Offers flexibility to define custom shutdown behavior for any part of your application.

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@andrew_l/graceful?style=flat
[npm-version-href]: https://npmjs.com/package/@andrew_l/graceful
[license-src]: https://img.shields.io/npm/l/@andrew_l/graceful?style=flat
