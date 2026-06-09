import { delay } from '@andrew_l/toolkit';
import { defineApp } from '../dist/index.mjs';

export default defineApp({
  name: 'simple-app-2',
  description: 'Example of simple application',
  props: {
    port: { type: Number, default: () => 8080, required: true },
  },
  async setup() {
    return {
      host: 'localhost',
    };
  },
  async entry(props) {
    console.info(`Start server on ${this.host}:${props.port}`);
    await delay(1000);
  },
  async stop() {
    console.info('Stop server');
  },
  async shutdown() {
    console.info('Shutdown server');
    await delay(1000);
  },
});
