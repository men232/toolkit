# Description <!-- omit in toc -->

![license](https://img.shields.io/npm/l/%40andrew_l%2Fgraceful) ![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fgraceful) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Fgraceful) <!-- omit in toc -->

Gracefully shuts down the application using dependencies.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/graceful/)

# Usage

```js
import { onShutdown } from '@andrew_l/graceful';

onShutdown('mongoose', ['http-server'], async () => {
  console.info('Graceful: mongodb connection.');
  await mongoose.disconnect();
});

onShutdown('http-server', async () => {
  console.info('Graceful: http server.');
  await httpServer.close();
});
```
