# Vue Stdout Toolkit <!-- omit in toc -->

![license](https://img.shields.io/npm/l/%40andrew_l%2Fvue-stdout) <!-- omit in toc -->
![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fvue-stdout) <!-- omit in toc -->
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Fvue-stdout) <!-- omit in toc -->

A custom Vue.js renderer for outputting content directly to the terminal (stdout), combining the flexibility of Vue with the power of console-based rendering.

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/vue-stdout/)

<!-- install placeholder -->

## ✨ Features

- **Terminal Flex Layout:** Built with Yoga Layout for flexible box-based terminal layouts.
- **Base Components:** Simplifies rendering common elements like boxes, text, and progress bars.
- **TypeScript Ready:** Full TypeScript support for enhanced developer experience.
- **Lightweight:** Minimal bundle size to ensure fast and efficient runtime performance.

## 🚀 Usage Example

```jsx
import { noop } from '@andrew_l/toolkit';
import {
  createApp,
  createContainer,
  ProgressBar,
  Box,
} from '@andrew_l/vue-stdout';

// Required for development mode
// https://github.com/privatenumber/tsx/issues/678
import '@andrew_l/vue-stdout/runtime';

const Main = defineComponent(() => {
  const progress = ref(0);

  const timer = setInterval(() => {
    progress.value++;
  }, 100);

  onBeforeUnmount(() => clearInterval(timer));

  return () => (
    <Box borderStyle="round">
      <Text>
        <Text>Hello From</Text>
        <Text color="green">
          {' '}
          Vue {(progress.value / 4) % 2 !== 0 ? '🤯' : ''}
        </Text>
      </Text>

      <ProgressBar
        variant="round"
        showPercent
        color={progress.value >= 100 ? 'cyan' : 'green'}
        value={progress.value}
      />
    </Box>
  );
});

const app = createApp(Main);
app.config.warnHandler = noop; // Suppress warnings
app.mount(createContainer());
```

Output

```
╭──────────────────────────────────────────────────────────────────────╮
│Hello From Vue 🤯                                                     │
│╭────────────────────────────────────────────────────────────────────╮│
││███████████████████████████████████████████████████████████████ 100%││
│╰────────────────────────────────────────────────────────────────────╯│
╰──────────────────────────────────────────────────────────────────────╯
```

## 🤔 Why Use This Package?

1. **Optimized for Terminal:** Ideal for CLI applications, interactive tools, and dashboards.
2. **Vue Ecosystem:** Leverages Vue’s declarative and reactive system for building rich console interfaces.
3. **Flexibility with Components:** Provides reusable components like Box, Text, and ProgressBar for structured layouts.
4. **TypeScript Support:** Offers type definitions for better IDE support and error checking.
