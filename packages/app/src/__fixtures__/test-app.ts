import { defineApp } from '../index.js';

const app = defineApp({
  name: 'test-app',
  description: 'fixture for tests',
  logger: false,
});

export default app;
