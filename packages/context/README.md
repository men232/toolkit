# Description <!-- omit in toc -->

![license](https://img.shields.io/npm/l/%40andrew_l%2Fcontext) ![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fcontext) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Fcontext) <!-- omit in toc -->

Bind async context like vue composition api.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/context/)

# Usage

```js
import { delay } from '@andrew_l/toolkit';
import { withContext } from '@andrew_l/context';

const main = withContext(() => {
  provide('user', { id: 1, name: 'Andrew' });

  await delay(1000);

  doCoolStaff();
});

const doCoolStaff = () => {
  const user = inject('user');
  console.log(user); // { id: 1, name: 'Andrew' }
};

main();
```
