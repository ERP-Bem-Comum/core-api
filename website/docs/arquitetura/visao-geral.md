---
sidebar_position: 1
title: Visão geral
description: Modular monolith, stack e topologia do core-api em 5 minutos.
---

# Arquitetura — visão geral

O `core-api` é um **modular monolith** (ADR-0006): um único processo Node.js com
módulos isolados por pasta em `src/modules/` — `contracts`, `auth`, `financial`,
`notifications`. Eles se comunicam por **eventos** (Outbox MySQL, ADR-0015), nunca por
chamada direta aos internals um do outro.

A regra que sustenta isso é simples e absoluta: **um módulo só importa do
`public-api/` de outro** — nunca de `domain/` ou `application/` alheio. É essa
disciplina que mantém a promessa de extrair qualquer módulo como serviço no futuro,
sem um refactor traumático.

## A stack

| Camada            | Escolha                                | ADR                |
| :---------------- | :------------------------------------- | :----------------- |
| Runtime           | Node.js 24 LTS                         | ADR-0002, ADR-0009 |
| Linguagem         | TypeScript 6 (roadmap TS 7)            | ADR-0009           |
| Módulos           | ESM (`type: module`, `NodeNext`)       | —                  |
| Package manager   | pnpm 11 (nunca npm)                    | ADR-0012 → ADR-0029 |
| Persistência      | Drizzle ORM + `mysql2` sobre MySQL 8.4 | ADR-0013, ADR-0020 |
| Borda HTTP        | Fastify (adapter de borda)             | ADR-0025           |
| Contrato de borda | Zod + zod-openapi (OpenAPI 3.1.1)      | ADR-0027           |
| Documentos        | S3 (prod) / MinIO (dev)                | ADR-0019           |
| Eventos           | Outbox MySQL                           | ADR-0015           |

## Topologia

O `core-api` não fala direto com o navegador. Um **BFF burro** (ADR-0005) cuida de
TLS e injeção de token; o `core-api` é a fronteira de regra de negócio. O legado
(NestJS) convive sob estratégia **Strangler Fig** (ADR-0001) — o novo backend absorve
responsabilidades de forma incremental, sem big-bang rewrite.

```mermaid
flowchart LR
  Browser -->|TLS, token| BFF[BFF burro]
  BFF -->|/api/v2| Core[core-api]
  BFF -.rotas legadas.-> Legacy[legacy-api NestJS]
  Core -->|Drizzle/mysql2| MySQL[(MySQL 8.4)]
  Core -->|@aws-sdk/client-s3| S3[(S3 / MinIO)]
  Core -->|Outbox| Worker[Outbox worker] --> Core
```

## Anatomia de um módulo

Cada módulo repete a mesma estrutura de quatro camadas:

```
src/modules/<módulo>/
├── domain/        # PURO: zero infra. Result<T,E>, branded types, switch exaustivo.
├── application/   # Use cases (factory functions) + ports (type contracts).
├── adapters/      # Única camada com infra real: Drizzle, S3, Fastify (http/), CLI.
└── public-api/    # Único ponto de import externo ao módulo: eventos + plugin HTTP.
```

A próxima página detalha as regras invariantes de cada camada, e por que elas não são
negociáveis.

:::tip Fonte
Guias narrativos completos vivem em `handbook/architecture/01-migration-strategy.md`
a `06-persistence-strategy.md`. Os ADRs ficam em `handbook/architecture/adr/`.
:::
