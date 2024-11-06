# Description

IOC Container

# Setup

Before running actual code, you need to setup service container.
This example will auto-import all `*.service.js` files from path service folders.

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
