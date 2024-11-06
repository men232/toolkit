import { defineConfig } from 'vitepress';
import typedocSidebar from '../reference/typedoc-sidebar.json';

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
  base: '/toolkit/',
  themeConfig: {
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
        v => !EXCLUDE_TYPEDOC_GROUPS.has((v as any).text),
      );

      if (pkg.items.length === 1 && pkg.items[0].text === 'Main') {
        pkg.items = pkg.items[0].items;
      }

      return pkg;
    }),

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/men232/toolkit',
      },
    ],
  },
});
