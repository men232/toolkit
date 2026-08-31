// Single import site for the layout engine. Everything else imports from here,
// so a future engine swap touches one file instead of five.
export { default as Yoga } from 'yoga-layout';
export type { Node as YogaNode } from 'yoga-layout';
