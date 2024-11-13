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

      const mainGroupIndex = pkg.items.findIndex(v => v.text === 'Main');

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
  },
});
