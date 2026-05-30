---
sidebar_position: 1
slug: /comecar
title: Começar
description: O que é o core-api, por que ele existe e como navegar esta documentação.
---

# Começar

Bem-vindo ao portal do **`core-api`** — o backend do ERP **Bem Comum**.

Esta não é uma referência de API (essa o OpenAPI já cobre). É um **livro sobre o
projeto**: o que ele é, por que foi construído deste jeito e as decisões que nos
trouxeram até aqui. Se você está chegando agora, comece por esta página e siga as
trilhas da navbar.

## Em uma frase

> O `core-api` é um **modular monolith** em Node.js 24 + TypeScript 6 (ESM), com o
> módulo **Contratos** completo (domínio puro → application → adapters Drizzle/MySQL
> → borda HTTP Fastify + CLI), mais os módulos `auth` (identidade & RBAC), `financial`
> e `notifications`.

Um único processo. Módulos isolados por pasta que **conversam só por eventos**, nunca
por chamada direta a internals. Cada módulo pode ser extraído como serviço no futuro
sem refactor traumático.

## Os princípios que valem para tudo

Antes de qualquer arquitetura, três ideias atravessam todo o código:

- **Erros são valores, não exceções.** O domínio nunca usa `throw` — devolve
  `Result<T, E>` com uniões de erro literais. `throw` só existe nos adapters e é
  convertido para `Result` na borda.
- **O domínio não conhece infraestrutura.** Banco, HTTP, S3 e framework vivem fora do
  domínio. Dentro dele só há regra de negócio: branded types, smart constructors,
  discriminated unions e `switch` exaustivo.
- **Toda decisão é rastreável.** 28 ADRs (Architecture Decision Records) imutáveis
  registram cada escolha. Quando código e ADR divergem, **o ADR vence**.

## Estado atual

- **Contratos:** domínio completo, persistência MySQL (Drizzle), CLI, **borda HTTP
  `/api/v2/contracts`** completa (reads, writes, documentos, export CSV).
- **Auth:** identidade própria + RBAC por permissão, JWT ES256, borda HTTP
  `/api/v2/auth` (ADR-0024).
- **Eventos:** Outbox MySQL (ADR-0015) para comunicação cross-módulo.
- **Storage:** S3 (prod) / MinIO (dev) via port único `DocumentStorage` (ADR-0019).

## Por onde seguir

| Se você quer…                           | Vá para                                                         |
| :-------------------------------------- | :-------------------------------------------------------------- |
| Entender o desenho geral do sistema     | [Arquitetura → Visão geral](/arquitetura/visao-geral)           |
| Saber por que o domínio é "puro"        | [Arquitetura → Camadas e regras](/arquitetura/camadas-e-regras) |
| Mergulhar no primeiro módulo end-to-end | [Módulos → Contratos](/modulos/contratos)                       |
| Conhecer o domínio financeiro           | [Módulos → Financeiro](/modulos/financeiro)                     |
| Ler as decisões arquiteturais           | [Decisões (ADRs) → Catálogo](/decisoes/catalogo)                |
| Conferir o vocabulário do negócio       | [Glossário](/glossario)                                         |

:::info Fonte de verdade
Este portal **consolida e narra** — a fonte canônica é o `handbook/` do repositório
(ADRs imutáveis, domínio formal, reference de tecnologia) e o próprio código. Onde
houver divergência, o handbook/ADR vence.
:::
