import { defineConfig } from 'vitepress';
import typedocSidebar from '../typedocs/typedoc-sidebar.json';

const EXCLUDE_TYPEDOC_GROUPS = new Set([
  'Classes',
  'Namespaces',
  'Interfaces',
  'Type Aliases',
  'Variables',
  'Functions',
]);

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Toolkit',
  description: 'Andrew L. Toolkit',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Type Docs', link: '/typedocs/' },
    ],

    sidebar: [
      {
        text: 'Type Docs',
        items: typedocSidebar.filter(
          v => !EXCLUDE_TYPEDOC_GROUPS.has((v as any).text),
        ),
      },
    ],

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/men232/toolkit/tree/main/packages/core',
      },
    ],
  },
});
