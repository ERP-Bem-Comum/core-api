# 01 — Arquitetura & ADRs

> Fonte de verdade: [`handbook/architecture/adr/`](../handbook/architecture/adr/) e
> [`CLAUDE.md`](../CLAUDE.md). Este doc resume e indexa.

## 1. Visão geral

`core-api` é um **modular monolith** (ADR-0006): um único processo Node.js, com módulos isolados por pasta
em `src/modules/` (`contracts`, `auth`, `financial`, `notifications`) que se comunicam por **eventos**
(Outbox MySQL, ADR-0015), nunca por chamada direta a internals. Cada módulo pode ser extraído como serviço
futuro sem refactor traumático.

**Stack:** Node.js 24 LTS · TypeScript 6 (roadmap TS 7, ADR-0009) · ESM (`type: module`, `NodeNext`) ·
pnpm (ADR-0012) · Drizzle ORM + `mysql2` sobre MySQL 8.4 (ADR-0013/0020) · Fastify na borda HTTP
(ADR-0025) · Zod contract-first + OpenAPI 3.1.1 (ADR-0027) · S3/MinIO para documentos (ADR-0019).

## 2. Camadas (por módulo)

```
src/modules/<módulo>/
├── domain/        # PURO: zero infra/framework. Result<T,E>, branded types, Readonly, switch exaustivo.
├── application/   # Use cases (factory functions) + ports (type contracts). Orquestra; sem regra de negócio.
├── adapters/      # Única camada com infra real: Drizzle/mysql2, S3, Fastify (http/), CLI.
└── public-api/    # Único ponto de import externo ao módulo (ADR-0006): eventos + (http) plugin/composition.
```

**Regras invariantes de camada** (resumo — ver [`.claude/rules/`](../.claude/rules/)):

- **domain/**: `throw` proibido (use `Result<T,E>`); sem `class`/`this`/`any`; branded types com smart
  constructors; discriminated unions com `switch` exaustivo; imutabilidade (`Readonly`, `readonly T[]`).
- **application/**: use cases são `(deps) => (input) => Promise<Result<O,E>>`; ports são `type Readonly<{}>`;
  sequência canônica **validar → fetch → domain → persist → publish event**.
- **adapters/**: `try/catch` permitido, mas **converte para `Result` na borda**; cada port tem adapter
  InMemory (teste) + real (Drizzle/S3/etc.).
- **Cross-módulo:** consumir **exclusivamente** `<módulo>/public-api/` (ADR-0006).

## 3. Ports & Adapters

O domínio declara dependências externas como **Ports** (types puros): `ContractRepository`,
`AmendmentRepository`, `DocumentRepository`, `DocumentStorage`, `EventBus`/`OutboxPort`, `Clock`,
`TokenIssuer`, etc. Cada port tem ≥ 2 implementações: **InMemory** (testes/CLI) e **real** (Drizzle/mysql2,
S3, etc.). O `composition root` (CLI `cli/context.ts`; HTTP `adapters/http/composition.ts`) escolhe o
adapter por **driver** (`memory` | `mysql`).

## 4. Hierarquia de regras (quando duas fontes discordam)

```
1. handbook/architecture/adr/   ← ADRs aceitos, IMUTÁVEIS, vencem tudo
2. handbook/ (domínio, reference/<tech>/, inquiries)
3. CLAUDE.md + .claude/rules/*.md
4. .claude/agents/<agent>.md
5. .claude/skills/<skill>/SKILL.md
```

Nunca contradizer ADR aceito — abrir novo ADR que `supersedes` o anterior (registrar em
[`handbook/CHANGELOG.md`](../handbook/CHANGELOG.md)).

## 5. Índice dos ADRs

> Diretório: [`handbook/architecture/adr/`](../handbook/architecture/adr/). ⚠️ alguns foram **superseded**.

| ADR  | Título                                                        | Nota                                             |
| :--- | :------------------------------------------------------------ | :----------------------------------------------- |
| 0001 | Estratégia Strangler Fig sobre Big Bang Rewrite               | migração incremental do legado                   |
| 0002 | Manter Node.js como Runtime nesta fase                        | runtime único                                    |
| 0003 | Banco compartilhado com schemas isolados                      | ⚠️ superseded por 0014                           |
| 0004 | Postgres Outbox como mecanismo de eventos                     | ⚠️ superseded por 0015                           |
| 0005 | BFF Gateway burro (apenas roteamento)                         | TLS/token no BFF                                 |
| 0006 | **Modular Monolith** para o `core-api`                        | + ports & adapters                               |
| 0007 | Topologia Multi-Cloud (AWS+GCP)                               | ⚠️ superseded por 0021                           |
| 0008 | Arquitetura da integração Bradesco                            | REST + VAN                                       |
| 0009 | **Node 24 + TypeScript 6** (roadmap TS 7)                     |                                                  |
| 0010 | Email — Port & Adapter (Nodemailer)                           | Fase 2+                                          |
| 0011 | **Supply-chain hardening**                                    | corepack, only-allow=pnpm, approve-builds        |
| 0012 | **pnpm** como package manager                                 | nunca npm                                        |
| 0013 | **MySQL 8** como engine                                       | correção de assunção                             |
| 0014 | **Isolamento por database** MySQL (prefixos `ctr_*`/`fin_*`)  | supersedes 0003                                  |
| 0015 | **MySQL Outbox Pattern**                                      | supersedes 0004                                  |
| 0017 | Chaves de correlação cross-período (auditoria fiscal)         |                                                  |
| 0018 | Persistência dual-dialect Drizzle (MySQL + SQLite)            | ⚠️ superseded por 0020                           |
| 0019 | **Document Storage** — S3 (prod) + MinIO (dev)                | `@aws-sdk/client-s3` único                       |
| 0020 | **MySQL como único dialeto**                                  | supersedes 0018; lista normativa de features SQL |
| 0021 | Topologia Cloud — AWS primária + MagaluCloud PBE              | supersedes 0007                                  |
| 0022 | **Read-models via projeção** (Timeline)                       | AuditLog diferido                                |
| 0023 | **Ciclo de vida do Contrato** — estado `Pendente` (4 estados) |                                                  |
| 0024 | **Identidade & RBAC** — módulo `auth`                         | OIDC-ready, permissions granulares               |
| 0025 | **Servidor HTTP com Fastify** (adapter de borda)              | BFF continua burro                               |
| 0026 | **Read/Write split** de conexão MySQL (writer/reader)         | Master-Slave ready                               |
| 0027 | **Zod + zod-openapi** contract-first da borda                 | OpenAPI 3.1.1                                    |
| 0028 | Localização do shell HTTP de borda + composition root         | verticalidade por feature                        |

ADRs **críticos** para entender o sistema hoje: **0006** (modular monolith), **0020** (MySQL único),
**0024** (auth/RBAC), **0025/0026/0027** (borda HTTP), **0015** (outbox), **0023** (estados do contrato).

## 6. Onde explorar a fundo

- Domínio formal: [`handbook/domain/`](../handbook/domain/) e
  [`handbook/domain_questions/contratos/`](../handbook/domain_questions/contratos/).
- Referência de tecnologia: [`handbook/reference/<tech>/`](../handbook/reference/) (typescript, nodejs,
  drizzle, mysql, mysql2, docker, pnpm, fastify, nodemailer).
- Regras por camada: [`.claude/rules/`](../.claude/rules/).
