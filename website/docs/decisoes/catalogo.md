---
sidebar_position: 2
title: Catálogo de ADRs
description: Os 28 Architecture Decision Records do core-api, agrupados por tema, com status.
---

# Catálogo de ADRs

Os 30 ADRs do `core-api`, agrupados por tema. Legenda de status: ✅ aceito ·
⚠️ superseded (substituído) · 🟦 proposed (proposto/aguardando gatilho). O texto normativo literal de cada um
está em `handbook/architecture/adr/`.

:::info
Os ADRs **críticos** para entender o sistema hoje: **0006** (modular monolith),
**0020** (MySQL único), **0024** (auth/RBAC), **0025/0026/0027** (borda HTTP),
**0015** (outbox), **0023** (estados do contrato).
:::

## Fundamentos & migração

| ADR  | Título                                          | Status | Nota                           |
| :--- | :---------------------------------------------- | :----: | :----------------------------- |
| 0001 | Estratégia Strangler Fig sobre Big Bang Rewrite |   ✅   | migração incremental do legado |
| 0002 | Manter Node.js como runtime nesta fase          |   ✅   | runtime único                  |
| 0006 | **Modular Monolith** para o `core-api`          |   ✅   | + ports & adapters             |
| 0009 | **Node 24 + TypeScript 6** (roadmap TS 7)       |   ✅   |                                |

## Persistência & dados

| ADR  | Título                                             | Status | Nota                                 |
| :--- | :------------------------------------------------- | :----: | :----------------------------------- |
| 0003 | Banco compartilhado com schemas isolados           |   ⚠️   | superseded por 0014                  |
| 0013 | **MySQL 8** como engine                            |   ✅   | correção de assunção                 |
| 0014 | Isolamento por database (prefixos `ctr_*`/`fin_*`) |   ✅   | supersedes 0003                      |
| 0018 | Persistência dual-dialect Drizzle (MySQL+SQLite)   |   ⚠️   | superseded por 0020                  |
| 0020 | **MySQL como único dialeto**                       |   ✅   | supersedes 0018; lista normativa SQL |
| 0022 | **Read-models via projeção** (Timeline)            |   ✅   | AuditLog diferido                    |
| 0026 | **Read/Write split** de conexão MySQL              |   ✅   | master-slave ready                   |

## Eventos & comunicação

| ADR  | Título                                    | Status | Nota                |
| :--- | :---------------------------------------- | :----: | :------------------ |
| 0004 | Postgres Outbox como mecanismo de eventos |   ⚠️   | superseded por 0015 |
| 0015 | **MySQL Outbox Pattern**                  |   ✅   | supersedes 0004     |

## Borda HTTP & identidade

| ADR  | Título                                            | Status | Nota                      |
| :--- | :------------------------------------------------ | :----: | :------------------------ |
| 0005 | BFF Gateway burro (apenas roteamento)             |   ✅   | TLS/token no BFF          |
| 0023 | **Ciclo de vida do Contrato** — estado `Pendente` |   ✅   | 4 estados                 |
| 0024 | **Identidade & RBAC** — módulo `auth`             |   ✅   | OIDC-ready, permissions   |
| 0025 | **Servidor HTTP com Fastify** (adapter de borda)  |   ✅   | BFF continua burro        |
| 0027 | **Zod + zod-openapi** contract-first              |   ✅   | OpenAPI 3.1.1             |
| 0028 | Localização do shell HTTP + composition root      |   ✅   | verticalidade por feature |

## Infra, cloud & integrações

| ADR  | Título                                         | Status | Nota                       |
| :--- | :--------------------------------------------- | :----: | :------------------------- |
| 0007 | Topologia Multi-Cloud (AWS + GCP)              |   ⚠️   | superseded por 0021        |
| 0008 | Arquitetura da integração Bradesco             |   ✅   | REST + VAN                 |
| 0019 | **Document Storage** — S3 (prod) + MinIO (dev) |   ✅   | `@aws-sdk/client-s3` único |
| 0021 | Topologia Cloud — AWS primária + Magalu PBE    |   ✅   | supersedes 0007            |
| 0017 | Chaves de correlação cross-período (auditoria) |   ✅   | sob Strangler Fig          |
| 0030 | Store compartilhado (Valkey via ioredis)       |   🟦   | **Proposed** — adiado até multi-instância |

## Tooling & supply-chain

| ADR  | Título                              | Status | Nota                                      |
| :--- | :---------------------------------- | :----: | :---------------------------------------- |
| 0010 | Email — Port & Adapter (Nodemailer) |   ✅   | Fase 2+ (ativo no reset de senha)         |
| 0011 | **Supply-chain hardening**          |   ✅   | corepack, only-allow=pnpm, approve-builds |
| 0012 | pnpm como package manager           |   ⚠️   | superseded por 0029                       |
| 0029 | **pnpm 11.x** com defaults de supply-chain |   ✅   | supersedes 0012; minimumReleaseAge, trustPolicy |

:::tip Como ler o original
Cada ADR é um arquivo em `handbook/architecture/adr/NNNN-titulo.md`. Eles seguem o
formato Contexto → Decisão → Consequências, e os superseded carregam um banner
apontando para o substituto.
:::
