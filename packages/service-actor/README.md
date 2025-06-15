# Service Actor Toolkit

![license](https://img.shields.io/npm/l/%40andrew_l%2Fservice-actor)
![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fservice-actor)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Fservice-actor)

The package is designed to help manage contextual data, such as trace IDs, across functions without explicitly passing them around. This allows you to easily track and manage contexts (like user actions or requests) while keeping your code clean and decoupled from context-passing logic.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/service-actor/)

<!-- install placeholder -->

## ✨ Features

- **Contextual Data Management**: Allows you to manage context (such as trace IDs or user info) in a central "actor" object.
- **No Context Passing**: Eliminates the need to manually pass context data between functions.
- **Custom Methods**: Actor objects can contain custom methods without affecting the data or iteration logic.
- **Compatible with Databases**: Actor objects are simple JavaScript objects and can be safely used in database queries.

## 🚀 Example Usage

### Setting up Actor Context

```js
import { serviceActor } from '@andrew_l/service-actor';

let traceIdSec = 0;

const { with: withServiceActor, inject: injectServiceActor } = serviceActor(
  () => ({
    traceId: `trace-${++traceIdSec}`,
    ipAddress: '0.0.0.0',
  }),
);

// Bind actor context to the request in your middleware
app.use((ctx, next) => {
  return withServiceActor(
    {
      traceId: ctx.headers['x-request-id'],
      ipAddress: ctx.headers['x-forwarded-for'],
    },
    next,
  );
});

app.patch('/users/:id', async ctx => {
  const actor = injectServiceActor(); // Inject service actor

  console.log('Updating user with', actor);

  await UserService.updateById(ctx.params.id, ctx.request.body);
  ctx.body = 'ok';
});
```

In the above example, the `traceId` and `ipAddress` are automatically associated with the current context (request), eliminating the need to manually pass them through function calls.

### Using Service Actor in a Service

```js
class UserService {
  static async updateById(targetId, data) {
    // Get the service actor from the context or create a new one if none exists
    const actor = useServiceActor({ actorType: 'service' });

    console.info('Updating user by id', { targetId, actor });

    await db.users.updateOne({ _id: targetId }, data);
  }
}
```

In this example, the `UserService.updateById` method retrieves the `actor` object, which contains contextual information, such as the trace ID, without explicitly passing it as an argument.

## 🤔 Why Use This Package?

1. **No Context Passing:** Automatically manages contextual information (e.g., trace IDs, user info) across different parts of your application.
2. **Cleaner Code:** Avoids cluttering your function signatures with unnecessary context arguments.
3. **Flexible and Extendable:** Actor objects can be extended with custom methods to suit your application's needs without interfering with the data.
4. **Database Safe:** Since the actor is just a plain object, it can be safely stored and used in database queries.
