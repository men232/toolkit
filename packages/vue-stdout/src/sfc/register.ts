import { register } from 'node:module';

// Resolve the sibling hook in both source (tsx) and built (.mjs) layouts.
const hookFile = import.meta.url.endsWith('.ts') ? './hook.ts' : './hook.mjs';

register(new URL(hookFile, import.meta.url));
