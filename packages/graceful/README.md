# Description

Gracefully application shutdown using dependencies.

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
