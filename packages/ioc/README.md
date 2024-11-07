# Description

IOC Container

# Setup

Before running the application code, set up the service container. This example auto-imports all `*.service.js` files from the service directories.

```js
import { ServiceContainer } from '@andrew_l/ioc';

await ServiceContainer.setup({
  pathRoot: process.cwd(),
  autoImportPatterns: ['./services/*/**/*.service.{js,mjs}'],
  typeOutput: './ioc.d.ts',
  generateTypes: true,
});

// your code
```

# Usage

```js
// user.service.js
import { ServiceContainer } from '@andrew_l/ioc';

export class UserService {
  async create() {
    // TODO
  }
}

ServiceContainer.set('UserService', UserService);
```

```js
// user.controller.js
import { ioc } from '@andrew_l/ioc';

export function createUser() {
	const UserService = ioc('UserService');

	ctx.body = await UserService.create(ctx.request.body);
}
```
