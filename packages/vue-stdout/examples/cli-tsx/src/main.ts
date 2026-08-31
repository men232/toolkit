import { createApp } from '@andrew_l/vue-stdout';
import App from './App.vue';

const app = createApp(App);

app.mount();

await app.waitUntilExit();
