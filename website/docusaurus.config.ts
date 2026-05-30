import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

// Portal de documentação do core-api (ERP Bem Comum).
// Conteúdo curado a partir do handbook/ — fonte de verdade canônica do projeto.
const config: Config = {
  title: 'core-api — ERP Bem Comum',
  tagline:
    'O backend modular monolith por dentro: arquitetura, domínio e as decisões que nos trouxeram até aqui',
  favicon: 'img/favicon.svg',

  url: 'https://docs.bem-comum.local',
  baseUrl: '/',

  organizationName: 'envolve-bem-comum',
  projectName: 'core-api',

  onBrokenLinks: 'warn',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR'],
  },


  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        language: ['pt', 'en'],
        indexBlog: false,
        docsRouteBasePath: '/',
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'core-api',
      logo: {
        alt: 'ERP Bem Comum',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guias',
          position: 'left',
          label: 'Guias',
        },
        {
          type: 'docSidebar',
          sidebarId: 'arquitetura',
          position: 'left',
          label: 'Arquitetura',
        },
        {
          type: 'docSidebar',
          sidebarId: 'decisoes',
          position: 'left',
          label: 'Decisões (ADRs)',
        },
        {
          to: '/glossario',
          position: 'left',
          label: 'Glossário',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentação',
          items: [
            { label: 'Começar', to: '/comecar' },
            { label: 'Arquitetura', to: '/arquitetura/visao-geral' },
            { label: 'Decisões (ADRs)', to: '/decisoes/o-que-e-adr' },
          ],
        },
        {
          title: 'Módulos',
          items: [
            { label: 'Contratos', to: '/modulos/contratos' },
            { label: 'Financeiro', to: '/modulos/financeiro' },
          ],
        },
        {
          title: 'Fonte de verdade',
          items: [
            { label: 'Hierarquia de fontes', to: '/arquitetura/hierarquia-de-fontes' },
            { label: 'Catálogo de ADRs', to: '/decisoes/catalogo' },
            { label: 'Glossário', to: '/glossario' },
          ],
        },
      ],
      copyright: `ERP Bem Comum · core-api · documentação gerada do handbook (${new Date().getFullYear()}).`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'sql', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
