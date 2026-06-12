import { delay } from '@andrew_l/toolkit';
import { defineApp } from '../dist/index.mjs';

export default defineApp({
  name: 'simple-app',
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
    this.log.info(`Start server on ${this.host}:${props.port}`);
    await delay(1000);
  },
  async stop() {
    this.log.info('Stop server');
  },
  async shutdown() {
    this.log.info('Shutdown server');
    await delay(1000);
  },
});
