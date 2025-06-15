# Context Toolkit

![license](https://img.shields.io/npm/l/%40andrew_l%2Fcontext)
![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fcontext)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Fcontext)

A lightweight toolkit to bind asynchronous contexts, inspired by Vue's Composition API. Easily provide and inject values across asynchronous scopes with support for scoped disposal.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/context/)

<!-- install placeholder -->

## ✨ Features

- **Intuitive API**: Designed to resemble Vue's `provide`/`inject`, making it familiar for developers experienced with Vue.
- **Deep Injection**: Seamlessly inject values across nested contexts.
- **Scoped Disposal**: Automatically execute all registered `onScopeDispose` callbacks when a scope is disposed, ensuring proper cleanup.

## 🚀 Example: Basic Usage

The following example demonstrates how to provide and inject values across an asynchronous context.

```js
// Define the main function with a context
const main = withContext(async () => {
  // Provide a user object to the context
  provide('user', { id: 1, name: 'Andrew' });

  await delay(1000);

  // Call another function that uses the provided context
  doCoolStuff();
});

// A separate function that retrieves and uses the injected context
const doCoolStuff = () => {
  // Inject the user object from the context
  const user = inject('user');
  console.log(user); // Output: { id: 1, name: 'Andrew' }
};

// Execute the main function
main();
```

## 🤔 Why Use This Package?

1. **Streamlined Context Management:** Provides an elegant solution for managing shared state across asynchronous functions without relying on global variables or complex patterns.
2. **Scoped Cleanup:** Automatically dispose of resources or listeners when a scope is terminated.
3. **Vue-Like Syntax:** Offers a familiar and intuitive API for developers with experience in Vue's Composition API.
