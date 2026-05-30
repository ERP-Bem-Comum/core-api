import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// Três trilhas de navegação, cada uma alimentando um item da navbar.
// As páginas-pilar são curadas à mão; ADRs e domínio são importados com tratamento leve.
const sidebars: SidebarsConfig = {
  guias: [
    'intro',
    {
      type: 'category',
      label: 'Módulos',
      collapsed: false,
      items: ['modulos/contratos', 'modulos/auth', 'modulos/financeiro'],
    },
    'glossario',
  ],

  arquitetura: [
    {
      type: 'category',
      label: 'Arquitetura',
      collapsed: false,
      items: [
        'arquitetura/visao-geral',
        'arquitetura/camadas-e-regras',
        'arquitetura/ports-e-adapters',
        'arquitetura/hierarquia-de-fontes',
      ],
    },
  ],

  decisoes: ['decisoes/o-que-e-adr', 'decisoes/catalogo'],
};

export default sidebars;
