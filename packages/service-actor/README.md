# Description

This package aims to avoid passing data like trace IDs between functions.

Actor object is structured like a simple, plain JavaScript object. This means it only contains properties (key-value pairs) without any special behaviors, so it can be used as a value in database queries without causing issues.

It also means you can add functions (methods) to Actor object. These custom methods won’t interfere with the data stored in the object or show up when you loop through (iterate over) the object's properties.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/service-actor/)

# Example

```js
import { serviceActor } from '@andrew_l/service-actor';

let traceIdSec = 0;

const { with: withServiceActor, inject: injectServiceActor } = serviceActor(
  () => ({
    traceId: `trace-${++traceIdSec}`,
    ipAddress: '0.0.0.0',
  }),
);

// Bind actor context to the request
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

# Usage

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
