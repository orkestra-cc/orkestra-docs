import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const GITHUB_ORG = 'orkestra-cc';
const DOCS_REPO = `${GITHUB_ORG}/orkestra-docs`;
const MONOREPO = `${GITHUB_ORG}/orkestra`;

const config: Config = {
  title: 'Orkestra',
  tagline: 'The SaaS plumbing every product rebuilds — already done.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.orkestra.cc',
  baseUrl: '/',

  organizationName: GITHUB_ORG,
  projectName: 'orkestra-docs',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: `https://github.com/${DOCS_REPO}/edit/main/`,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/orkestra-social-card.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Orkestra',
      logo: {
        alt: 'Orkestra',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/modules',
          label: 'Modules',
          position: 'left',
        },
        {
          to: '/sdk',
          label: 'SDK',
          position: 'left',
        },
        {
          to: '/api',
          label: 'API',
          position: 'left',
        },
        {
          href: `https://github.com/${MONOREPO}`,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Getting Started', to: '/getting-started'},
            {label: 'Architecture', to: '/architecture'},
            {label: 'Operating Orkestra', to: '/operating'},
            {label: 'Module Catalog', to: '/modules'},
          ],
        },
        {
          title: 'Develop',
          items: [
            {label: 'SDK Reference', to: '/sdk'},
            {label: 'API Reference', to: '/api'},
            {label: 'ADRs', to: '/adrs'},
            {label: 'Contributing', to: '/contributing'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub (monorepo)', href: `https://github.com/${MONOREPO}`},
            {label: 'GitHub (docs)', href: `https://github.com/${DOCS_REPO}`},
            {label: 'orkestra.cc', href: 'https://orkestra.cc'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Orkestra. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'go', 'yaml', 'json', 'toml', 'docker'],
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
