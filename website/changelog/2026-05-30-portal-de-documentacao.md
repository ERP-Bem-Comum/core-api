---
slug: portal-de-documentacao
title: 📖 Nasce o portal de documentação
authors: [time-core-api]
tags: [docs]
date: 2026-05-30T16:00
---

Este portal entrou no ar. A ideia: um **livro vivo sobre o projeto** — não uma referência de API
(isso o OpenAPI já cobre), mas a narrativa das decisões, do domínio e da arquitetura.

{/* truncate */}

## O que tem aqui

- **[Começar](/comecar)** — o que é o core-api e os princípios que valem para tudo.
- **[Arquitetura](/arquitetura/visao-geral)** — modular monolith, camadas e regras, ports & adapters,
  hierarquia de fontes.
- **[Módulos](/modulos/contratos)** — Contratos, Financeiro (e agora Auth).
- **[Decisões (ADRs)](/decisoes/catalogo)** — o catálogo navegável dos ADRs.
- **[Glossário](/glossario)** — a linguagem ubíqua do negócio.
- **Changelog** — esta seção, para acompanhar cada marco. 🎉

## Como foi feito

Docusaurus, isolado do core-api (workspace pnpm próprio), com o conteúdo curado a partir do
`handbook/` — que continua sendo a fonte de verdade canônica. Quando o portal e o handbook
divergirem, o handbook vence.
