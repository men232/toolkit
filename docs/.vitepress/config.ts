import { defineConfig } from 'vitepress';
import typedocSidebar from '../reference/typedoc-sidebar.json';

const EXCLUDE_TYPEDOC_GROUPS = new Set([
  'Classes',
  'Namespaces',
  'Interfaces',
  'Type Aliases',
  'Variables',
  'Functions',
  'Enumerations',
]);

const BASE = '/toolkit/';
const SITE_URL = `https://men232.github.io${BASE}`;
const DESCRIPTION =
  'Focused, production-grade TypeScript packages for Node.js services, CLI tools, and web applications.';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Toolkit',
  description: DESCRIPTION,
  base: BASE,

  // Absolute paths — `base` is not applied to raw head tags
  head: [
    [
      'link',
      { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` },
    ],
    ['meta', { name: 'theme-color', content: '#f76707' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Andrew L. Toolkit' }],
    ['meta', { property: 'og:description', content: DESCRIPTION }],
    ['meta', { property: 'og:url', content: SITE_URL }],
    ['meta', { property: 'og:image', content: `${SITE_URL}og-image.png` }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: `${SITE_URL}og-image.png` }],
  ],

  themeConfig: {
    logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },

    search: {
      provider: 'local',
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Reference', link: '/reference/' },
    ],

    sidebar: (typedocSidebar as any[]).map(pkg => {
      pkg.items = pkg.items.filter(
        (v: any) => !EXCLUDE_TYPEDOC_GROUPS.has((v as any).text),
      );

      const mainGroupIndex = pkg.items.findIndex((v: any) => v.text === 'Main');

      if (mainGroupIndex > -1) {
        const mainGroupItems = pkg.items[mainGroupIndex].items;

        pkg.items.splice(mainGroupIndex, 1);
        pkg.items = [...mainGroupItems, ...pkg.items];
      }

      return pkg;
    }),

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/men232/toolkit',
      },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024–present Andrew L.',
    },
  },
});
