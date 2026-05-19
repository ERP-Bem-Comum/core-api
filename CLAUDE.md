# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## IMPORTANTE:

- NÃO USE NPM e sim pnpm, para qualquer coisa que usaria NPM.

## O que é este repositório

`core-api` — backend do ERP Bem Comum, modelado como **modular monolith**. Fase 1 entrega apenas o **módulo Contratos** (`src/modules/contracts/`). Fases futuras adicionam Financeiro e outros, todos sob o mesmo processo Node mas com isolamento de pasta + comunicação por eventos (handbook §06).

**Stack:** Node.js 24 LTS · TypeScript 6.0 (roadmap TS 7 — ADR-0009) · ESM (`type: "module"`, `NodeNext`) · pnpm · Drizzle ORM com `mysql2` (MySQL 8 — ADR-0020) · CLI como UX primária (nenhum servidor HTTP ainda).

**Source of truth da arquitetura:** [`handbook/`](./handbook/) — copiado do monorepo pai para tornar este projeto auto-contido. Quando código e handbook discordam, **o handbook vence**.

---

## Hierarquia de regras (quando duas fontes discordam)

```
1. handbook/architecture/adr/             ← ADRs aceitos, IMUTÁVEIS, vencem tudo
2. handbook/ (domínio, infra, inquiries, reference/<tech>/)
3. Este CLAUDE.md (regras transversais do código)
4. .claude/agents/<agent>.md              (especialistas em tecnologia — quando uma área tem agente próprio)
5. .claude/skills/<skill>/SKILL.md        (como aplicar as regras)
6. .claude/skills/<skill>/references/     (docs externas, citadas, não normativas)
```

Nunca contradizer um ADR aceito — abrir novo ADR que `supersedes` o anterior, registrar em `handbook/CHANGELOG.md`.

ADRs críticos que governam decisões atuais:

- **[ADR-0002](./handbook/architecture/adr/0002-keep-nodejs-runtime.md)** — Manter Node.js como runtime único.
- **[ADR-0006](./handbook/architecture/adr/0006-modular-monolith-core-api.md)** — Modular monolith + ports & adapters.
- **[ADR-0009](./handbook/architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md)** — Node 24 + TS 6, plano de migração TS 7.
- **[ADR-0010](./handbook/architecture/adr/0010-email-port-adapter-pattern.md)** — Email Port/Adapter Pattern (Fase 2+).
- **[ADR-0011](./handbook/architecture/adr/0011-supply-chain-hardening.md)** — Supply-chain hardening (corepack, `only-allow=pnpm`, `approve-builds`).
- **[ADR-0012](./handbook/architecture/adr/0012-pnpm-package-manager.md)** — `pnpm` é o package manager canônico.
- **[ADR-0013](./handbook/architecture/adr/0013-mysql-database-engine.md)** — MySQL 8 é o engine de produção.
- **[ADR-0014](./handbook/architecture/adr/0014-mysql-database-isolation.md)** — Isolamento por prefixo (`ctr_*`, `fin_*`, `outbox`).
- **[ADR-0015](./handbook/architecture/adr/0015-mysql-outbox-pattern.md)** — Outbox pattern para eventos cross-módulo.
- **[ADR-0019](./handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md)** — Document storage AWS S3 (prod) + MinIO via Docker (dev). `@aws-sdk/client-s3` é o cliente único.
- **[ADR-0020](./handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md)** — MySQL 8.4 como único dialeto em todo o ciclo de vida (dev local via Docker compose, CI, prod). Lista normativa atualizada de features SQL permitidas/proibidas. Supersedes ADR-0018.

---

## Regras invariantes de código (não-negociáveis)

### Domínio puro (`src/modules/*/domain/`)

- **`throw` proibido.** Operações retornam `Result<T, E>` (ver `src/shared/result.ts`). `throw` só em adapters, e mesmo lá deve ser convertido para `Result` antes de cruzar a borda.
- **Sem `class`, sem `this`.** Operações são funções standalone sobre `Readonly<{...}>` types. Smart constructors em vez de construtores. ESLint trava `ClassDeclaration` e `ClassExpression`.
- **Sem `any`.** Use `unknown` com narrowing. Se `as` for inevitável, comentar o porquê (padrão: `as unknown as T`).
- **Branded types** para IDs e valores validados — `ContractId`, `AmendmentId`, `Money`, `Period`, `BucketName`, `StorageKey`. Definição em `src/shared/brand.ts`. Smart constructor obrigatório (`Money.fromCents(raw): Result<Money, MoneyError>`).
- **Discriminated unions + `switch` exaustivo.** Compilador trava com `noFallthroughCasesInSwitch`; ESLint refoça com `switch-exhaustiveness-check`. Nunca usar `default: throw` — usar `default: { const _: never = x; return _; }` ou omitir default.
- **Erros são string literal unions**, não classes. Ex.: `type ContractError = 'contract-not-active' | 'contract-cannot-expire-yet' | ...`.
- **Imutabilidade absoluta** — `Readonly<>`, `readonly T[]`, `as const`. Mudança de estado via cópia (`{ ...prev, status: 'Expired' }`).

### Application (`src/modules/*/application/`)

- Use cases são **factory functions**: `(deps: Readonly<{...}>) => (input) => Promise<Result<O, E>>`.
- **Ports são `type`**, nunca `interface` com implementação nem `class`. Cada port é um `Readonly<{...}>` de funções.
- Sequência canônica num use case: **validar → fetch → domain → persist → publish event**. Eventos só após o save ter sucesso.
- Sem importar de `adapters/`. Application conhece apenas tipos de port.

### Adapters (`src/modules/*/adapters/` + `cli/`)

- `try/catch` permitido, mas **converter para `Result` na borda** antes de devolver ao application/domain.
- Implementações concretas dos ports. Cada port tem ao menos: adapter `InMemory` (testes) + adapter real (Drizzle, S3, etc).

### Sintaxe / módulos

- **`import type { X }`** ou `import { type X }` para imports puramente de tipo (`verbatimModuleSyntax` no `tsconfig`).
- **Extensões `.ts` nos imports relativos** (`allowImportingTsExtensions: true`). Ex: `import { Money } from '../shared/money.ts'`.
- **Subpath imports `#src/*`** declarados em `package.json#imports` — usados em testes para evitar `../../../../` longos. Ex: `import { Money } from '#src/modules/contracts/domain/shared/money.ts'`.
- **`tsconfig.json`** aplica strict completo: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `isolatedModules`, `verbatimModuleSyntax`.

### Idioma (regra invariante)

| Camada                                                           | Idioma                                                     |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Código (tipos, funções, variáveis, pastas, arquivos)             | **EN**                                                     |
| Strings ao humano (mensagens da CLI, erros formatados)           | **PT** (via dicionário em `cli/formatters/`)               |
| Documentação (`.claude/`, `.pipeline/`, READMEs, handbook, ADRs) | **PT**                                                     |
| Erros internos (string literal union)                            | **EN kebab-case** — `'contract-not-active'`                |
| Eventos de domínio                                               | **EN passado** — `ContractCreated`, `AmendmentHomologated` |
| IDs de ticket                                                    | **EN** — `CTR-VO-MONEY`, `CTR-STORAGE-PORT`                |
| Commit messages                                                  | **PT** — `feat(contracts): adiciona VO Money`              |

---

## Trabalho não-trivial passa pela pipeline fail-first W0→W3

**Toda mudança em código de produção** (novo agregado, VO, use case, adapter, refactor que cruza fronteira de módulo) abre um ticket em `.claude/.pipeline/<TICKET-ID>/`. Bug fix trivial (1-3 linhas) ou mudança de config (`tsconfig`, `package.json`) pode ir direto.

```
.claude/.pipeline/<TICKET-ID>/
├── 000-request.md           # escopo (humano escreve antes de começar)
├── 002-tests/REPORT.md      # W0 — testes RED (falham por inexistência da API)
├── 003-impl/REPORT.md       # W1 — implementação mínima até GREEN
├── 004-code-review/REVIEW.md  # W2 — audit read-only (max 3 rounds)
├── 005-quality/REPORT.md    # W3 — tsc + format + tests + build
└── STATE.md                 # status acumulado
```

**Disciplina de waves:**

- **W0 RED:** escrever testes que falham **antes** de tocar em src/. Testes consomem a API pública pretendida — o erro deve ser "módulo não existe" ou "função não encontrada".
- **W1 GREEN:** implementar **o mínimo** para os testes da W0 passarem. Nada além disso.
- **W2 REVIEW:** read-only. Issues registradas como `arquivo:linha`. APPROVED ou REJECTED com lista. Max 3 rounds antes de escalar.
- **W3 QUALITY:** `pnpm run typecheck` + `pnpm run format:check` + `pnpm test` — todos verdes.

Cada ticket existente em `.claude/.pipeline/` (CTR-VO-IDS, CTR-AGG-CONTRACT, CTR-USECASE-CREATE-AMENDMENT, CTR-ADAPTER-DRIZZLE-DUAL, CTR-STORAGE-PORT, etc.) é histórico auditável — **não deletar**.

---

## Roteamento via `contratos-orchestrator`

[`./.claude/agents/contratos-orchestrator.md`](./.claude/agents/contratos-orchestrator.md) é o **ponto de entrada único**. Ele identifica intenção, decide se delega para um **agente especialista** (quando a tarefa é fortemente atrelada a uma tecnologia) ou para uma **skill** (quando o tema é técnica/disciplina aplicada), e orquestra as 4 waves.

### Agentes especialistas (por tecnologia em `handbook/reference/`)

Cada agente é ancorado no subdir correspondente de `handbook/reference/<tech>/` e nos ADRs vinculantes. Carrega **um único** agente por turno.

| Quando o tema é…                                              | Agente                                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Roteamento + pipeline W0→W3                                   | [`contratos-orchestrator`](./.claude/agents/contratos-orchestrator.md)                   |
| TypeScript / type system / Modules / tsconfig                 | [`typescript-language-expert`](./.claude/agents/typescript-language-expert.md)           |
| Node.js runtime / `node:test` / ESM / signals / AsyncLocalStorage | [`nodejs-runtime-expert`](./.claude/agents/nodejs-runtime-expert.md)                   |
| Drizzle ORM (schema, query builder, Drizzle Kit, transações)  | [`drizzle-orm-expert`](./.claude/agents/drizzle-orm-expert.md)                           |
| MySQL puro (EXPLAIN, índice, locks, tuning, replicação)       | [`mysql-database-expert`](./.claude/agents/mysql-database-expert.md)                     |
| Driver `mysql2` (pool, `caching_sha2_password`, TLS, timeouts) | [`mysql2-driver-expert`](./.claude/agents/mysql2-driver-expert.md)                       |
| Docker / Compose / Dockerfile / BuildKit                      | [`docker-compose-expert`](./.claude/agents/docker-compose-expert.md)                     |
| pnpm / lockfile / supply-chain / corepack                     | [`pnpm-workspace-expert`](./.claude/agents/pnpm-workspace-expert.md)                     |
| Fastify (HTTP — **reservado, Fase 2+, exige ADR**)            | [`fastify-server-expert`](./.claude/agents/fastify-server-expert.md)                     |
| Nodemailer (adapter SMTP — **reservado, Fase 2+**)            | [`nodemailer-email-expert`](./.claude/agents/nodemailer-email-expert.md)                 |

### Skills (técnicas/disciplinas aplicadas)

| Atividade                                              | Skill                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Modelar agregado/VO/evento de domínio                  | [`ts-domain-modeler`](./.claude/skills/ts-domain-modeler/SKILL.md)             |
| Definir port (Repository, EventBus, Storage, Clock)    | [`ports-and-adapters`](./.claude/skills/ports-and-adapters/SKILL.md)           |
| Modelar schema Drizzle (`mysqlTable`, índices, FKs)    | [`drizzle-schema-author`](./.claude/skills/drizzle-schema-author/SKILL.md)     |
| Contratos entre módulos (`ctr_*` ↔ `fin_*` via outbox) | [`modular-monolith`](./.claude/skills/modular-monolith/SKILL.md)               |
| Subcomando de CLI                                      | [`application-cli-builder`](./.claude/skills/application-cli-builder/SKILL.md) |
| Scripts FS em Node 24 + strip-types                    | [`nodejs-fs-scripter`](./.claude/skills/nodejs-fs-scripter/SKILL.md)           |
| Invocar processos externos (git, docker, pnpm…)        | [`nodejs-process-runner`](./.claude/skills/nodejs-process-runner/SKILL.md)     |
| Modelagem aplicada de DB (DDL + EXPLAIN)               | [`database-engineer`](./.claude/skills/database-engineer/SKILL.md)             |
| Ensino conceitual de DB                                | [`database-tutor`](./.claude/skills/database-tutor/SKILL.md)                   |
| Comparações / fundamentação de DB                      | [`database-theorist`](./.claude/skills/database-theorist/SKILL.md)             |
| TDD aplicado (red-green-refactor)                      | [`tdd-strategist`](./.claude/skills/tdd-strategist/SKILL.md)                   |
| Ensino TDD do zero                                     | [`tdd-tutor`](./.claude/skills/tdd-tutor/SKILL.md)                             |
| Fundamentos de TDD / escolas                           | [`tdd-theorist`](./.claude/skills/tdd-theorist/SKILL.md)                       |
| Code review aplicado (Clean Code / SOLID)              | [`clean-code-reviewer`](./.claude/skills/clean-code-reviewer/SKILL.md)         |
| Ensino Clean Code do zero                              | [`clean-code-tutor`](./.claude/skills/clean-code-tutor/SKILL.md)               |
| Fundamentos / críticas de Clean Code                   | [`clean-code-theorist`](./.claude/skills/clean-code-theorist/SKILL.md)         |
| Executar pipeline W0→W3 de um ticket                   | [`pipeline-maestro`](./.claude/skills/pipeline-maestro/SKILL.md)               |
| Revisão read-only (W2)                                 | [`code-reviewer`](./.claude/skills/code-reviewer/SKILL.md)                     |
| Gate final de qualidade (W3)                           | [`ts-quality-checker`](./.claude/skills/ts-quality-checker/SKILL.md)           |

**Regra:** **um agente OU uma skill por vez**. Outros viram referência via `[[link]]`. Quando a tarefa cruza tecnologias, o orquestrador escolhe o mais especializado e roteia para os demais como leitura/parecer.

---

## Comandos

> **Regra invariante:** sempre `pnpm`, nunca `npm` (ADR-0012 + memória persistente). Qualquer doc/PR com `npm install`/`npm run` deve ser convertido.

```bash
# Setup
pnpm install                                                                # respeita pnpm-lock.yaml + corepack
pnpm install --frozen-lockfile                                              # em CI

# Qualidade
pnpm run typecheck      # tsc --noEmit (parte do W3)
pnpm run format         # prettier --write .
pnpm run format:check   # prettier --check . (parte do W3)
pnpm run lint           # eslint . (flat config, typescript-eslint strict + stylistic + type-checked)
pnpm run lint:fix       # eslint . --fix

# Testes (Node test runner nativo + experimental-strip-types)
pnpm test               # roda todos tests/**/*.test.ts
pnpm run test:integration  # sobe MySQL via Docker compose (--wait) e roda os tests integration

# Rodar um único teste — Node nativo:
node --test --experimental-strip-types --no-warnings tests/modules/contracts/domain/shared/money.test.ts

# Rodar só um describe/it específico — usar --test-name-pattern:
node --test --experimental-strip-types --no-warnings --test-name-pattern="fromCents" tests/modules/contracts/domain/shared/money.test.ts

# CLI da P.O. — usa o módulo Contracts diretamente
pnpm run cli:contracts -- listar-contratos
pnpm run cli:contracts -- criar-contrato --numero 001/2026 --titulo "..." --objetivo "..." --assinado-em 2026-01-10 --valor-centavos 10000000 --inicio 2026-01-15 --fim 2026-12-31
pnpm run cli:contracts -- --help

# Driver de persistência da CLI (default: memory + state file JSON)
pnpm run cli:contracts -- listar-contratos --no-state                       # memory sem state file
pnpm run cli:contracts -- listar-contratos --driver mysql --connection-string 'mysql://user:pass@127.0.0.1:3306/core'

# Migrations (Drizzle Kit)
pnpm run db:generate                                                        # gera SQL em src/modules/contracts/adapters/persistence/migrations/mysql/

# Secrets de dev (gera ./secrets/*.txt para o docker-compose pickear)
pnpm run secrets:setup
```

**Pre-commit hook:** [`.claude/hooks/pre-commit-typecheck.sh`](./.claude/hooks/pre-commit-typecheck.sh) bloqueia commit se `tsc --noEmit` falhar. Para configurar: `git config core.hooksPath .claude/hooks`.

---

## Convenções de testes

- **Discovery:** apenas `tests/**/*.test.ts` é descoberto pelo runner.
- **Suítes parametrizadas reutilizáveis:** sufixo `.contract.ts` ou `.suite.ts`. **Não são executadas direto** — exportam uma função `(makeImpl) => void` que adapters consomem dentro do próprio `describe()`. Exemplos: `tests/modules/contracts/adapters/persistence/contract-repository.suite.ts`, `tests/modules/contracts/application/ports/document-storage.contract.ts`.
- **Mirror do `src/`:** `tests/modules/contracts/domain/shared/money.test.ts` testa `src/modules/contracts/domain/shared/money.ts`.
- **Tests podem importar via `#src/*`** (subpath imports declarados no `package.json`).
- **Regras ESLint relaxadas em `tests/**`** (ver `eslint.config.js`final): floating-promises, non-null-assertion, return type, naming-convention — todos`off` em testes.

---

## Topologia de execução por driver

A CLI roda contra dois backends, escolhidos por flag `--driver` (ADR-0020 — MySQL único):

| Driver             | Repositórios                                                                    | Persistência                                                                         | Quando usar                                   |
| ------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------- |
| `memory` (default) | `InMemoryContractRepository`, `InMemoryAmendmentRepository`, `InMemoryEventBus` | State file JSON (`./cli-state.json` ou `--state <path>`) ou ephemeral (`--no-state`) | Validação rápida da P.O., testes E2E offline  |
| `mysql`            | Drizzle/mysql2 — pool + transação + SELECT-then-UPDATE-or-INSERT                | Container Docker compose (dev) ou MySQL 8 managed (prod); migration aplicada no boot | Dev local com persistência real, CI E2E, prod |

ADR-0020 lista as features SQL **permitidas** (SELECT/INSERT/UPDATE/DELETE, JOIN, FK, transações, índices, CHECK, agregações simples, `ON DUPLICATE KEY UPDATE`, window functions, CTEs recursivas, FULLTEXT) e **proibidas por razão própria** (JSON nativo, stored procs/triggers, `ENUM` nativo, tipos espaciais, `AUTO_INCREMENT` em PK de domínio, isolation level explícito).

---

## Mapa de camadas do módulo Contracts

```
src/modules/contracts/
├── domain/                    # PURO. Sem infra. Result<T,E>, branded, Readonly.
│   ├── shared/                # VOs: Money, Period, ContractId, AmendmentId, DocumentId, UserRef, BucketName, StorageKey, StorageRef
│   ├── contract/              # Agregado Contract: types, events, errors, contract.ts (operações)
│   └── amendment/             # Agregado Amendment: types, events, errors, amendment.ts
├── application/
│   ├── ports/                 # type contracts: ContractRepository, AmendmentRepository, EventBus, DocumentStorage
│   └── use-cases/             # createContract, createAmendment, attachSignedDocument, homologateAmendment, getContract, listContracts
├── adapters/                  # Implementações concretas
│   ├── *.in-memory.ts         # Para testes
│   └── persistence/           # Drizzle/mysql2 (schema mysql, mappers, repos, driver, migrations)
├── cli/                       # CLI para P.O.
│   ├── main.ts                # Entrypoint
│   ├── registry.ts            # Mapa subcomando → módulo
│   ├── parse-flags.ts, parse-driver-flags.ts
│   ├── context.ts, state.ts   # Estado/persistência da CLI
│   ├── drivers/{memory,mysql}.ts
│   ├── commands/              # Um arquivo por subcomando
│   └── formatters/            # PT-BR para humanos (date, money, period, status, error, contract, amendment)
└── public-api/                # (futuro) Eventos e commands exportados para outros módulos
```

**Estado vigente do contrato** (`currentValue`, `currentPeriod`) é **derivado** de `originalValue/Period + Σ aditivos homologados`. Nunca editado diretamente. Operação canônica: `Contract.applyHomologatedAdjustment(contract, adjustment, at)`. Regra de negócio principal do handbook (RN-06, RN-07).

**Aditivo** tem 4 kinds (`Addition`, `Suppression`, `TermChange`, `Misc`) e 2 status (`Pending`, `Homologated`). Homologação **exige** `signedDocumentRef` (RN-12). `homologate(amendment, by, at)` muda status; o use case `homologateAmendment` então traduz o aditivo para `ContractAdjustment` (discriminated union para o domínio do Contract) e aplica no contrato.

---

## Anti-padrões (não fazer)

1. **Carregar múltiplos agentes/skills simultaneamente** sem necessidade — orquestrador escolhe **um**.
2. **Duplicar regras** que já vivem neste arquivo, no handbook ou em SKILL.md / agent.md — referencie, não copie.
3. **Pular waves** (ir direto pra W1 sem W0 RED) — quebra o fail-first.
4. **Misturar módulos** numa sessão (`ctr_*` e `fin_*` ao mesmo tempo) — ofende ADR-0014.
5. **Editar ADR aceito** — cria novo que `supersedes` o anterior.
6. **Editar código não-trivial sem ticket** em `.claude/.pipeline/<TICKET>/000-request.md`.
7. **`throw new Error(...)` no `default` de switch exhaustivo** — usar `const _: never = x` apenas.
8. **`import` sem extensão `.ts`** — `NodeNext` exige o caminho completo.
9. **`import` de tipo sem `type`** — `verbatimModuleSyntax` exige `import type { X }` ou `import { type X }`.
10. **`npm` em qualquer doc, script, PR ou comentário** — sempre `pnpm` (ADR-0012).
11. **Ativar agentes reservados** (`fastify-server-expert`, `nodemailer-email-expert`) sem antes abrir o ADR de adoção da tecnologia.
12. **Citar `.mdx`/`.md` do handbook "de memória"** — abrir o arquivo e citar literalmente.

---

## Referências externas (`handbook/reference/`)

Documentação canônica de bibliotecas/runtime que o projeto usa. **Consultar antes** de modelar tipos avançados, escrever SQL/Drizzle, editar Dockerfile, etc. Cada subdir tem um **agente especialista** próprio (ver tabela em §"Roteamento via `contratos-orchestrator`"):

- [`handbook/reference/typescript/`](./handbook/reference/typescript/) — TS oficial. Tópicos críticos: branded types, discriminated unions, Mapped/Conditional Types, `keyof`/`typeof`, Modules (ESM + NodeNext). → [`typescript-language-expert`](./.claude/agents/typescript-language-expert.md).
- [`handbook/reference/nodejs/`](./handbook/reference/nodejs/) — APIs nativas Node 24 (`node:test`, `node:crypto`, `node:async_hooks`, etc). → [`nodejs-runtime-expert`](./.claude/agents/nodejs-runtime-expert.md).
- [`handbook/reference/drizzle/`](./handbook/reference/drizzle/) — schemas, queries, migrations, get-started, Drizzle Kit. → [`drizzle-orm-expert`](./.claude/agents/drizzle-orm-expert.md) + skill [`drizzle-schema-author`](./.claude/skills/drizzle-schema-author/SKILL.md).
- [`handbook/reference/mysql/`](./handbook/reference/mysql/) — Refman 8.4 + 12 best-practices (JusDB). → [`mysql-database-expert`](./.claude/agents/mysql-database-expert.md).
- [`handbook/reference/mysql2/`](./handbook/reference/mysql2/) — driver Node.js (pool, auth, TLS). → [`mysql2-driver-expert`](./.claude/agents/mysql2-driver-expert.md).
- [`handbook/reference/docker/`](./handbook/reference/docker/) — Dockerfile, Compose, BuildKit, multi-stage. → [`docker-compose-expert`](./.claude/agents/docker-compose-expert.md).
- [`handbook/reference/pnpm/`](./handbook/reference/pnpm/) — settings + CLI + supply-chain. → [`pnpm-workspace-expert`](./.claude/agents/pnpm-workspace-expert.md).
- [`handbook/reference/fastify/`](./handbook/reference/fastify/) — Server, Routes, Hooks, Plugins (HTTP **reservado, Fase 2+**). → [`fastify-server-expert`](./.claude/agents/fastify-server-expert.md).
- [`handbook/reference/fastify-plugins/`](./handbook/reference/fastify-plugins/) — `@fastify/cors`, `helmet`, `rate-limit`, `swagger`, `swagger-ui`. → [`fastify-server-expert`](./.claude/agents/fastify-server-expert.md).
- [`handbook/reference/nodemailer/`](./handbook/reference/nodemailer/) — SMTP, DKIM, transports, plugins (email **reservado, Fase 2+**). → [`nodemailer-email-expert`](./.claude/agents/nodemailer-email-expert.md).

Eventos e commands cross-módulo, fluxo de domínio, regras de negócio formais: [`handbook/domain_questions/contratos/`](./handbook/domain_questions/contratos/) e [`handbook/domain/`](./handbook/domain/).

---

## Política de material local-only (`handbook/guidelines/`)

A pasta [`handbook/guidelines/`](./handbook/guidelines/) é **local-only** — **não vai pro repositório Git** (versionada em `.gitignore`). Contém material de referência com restrição de redistribuição (PDFs oficiais Bradesco para integração CNAB/Pix/WebService, guias internos confidenciais, etc).

**Regra:** todas as IAs CLI que operam neste projeto **devem ler esta pasta quando o contexto pedir** (integração bancária, layouts de arquivo, APIs Bradesco). O conteúdo é autorizado para leitura local; só não pode sair do disco da máquina.

### Como cada IA CLI acessa

| IA | Como acessa | Filtra `.gitignore` por padrão? |
| :--- | :--- | :---: |
| **Claude Code** | `Read` + `Bash`/`Glob`/`Grep` vão direto ao filesystem | Não — funciona automaticamente |
| **Gemini CLI** | Por default ignora arquivos não-tracked; precisa flag `--all-files` ou referenciar path explícito (`@handbook/guidelines/...`) | Sim — precisa override |
| **GitHub Copilot** | Lê do workspace (sem filtro git) | Não |
| **Cursor / VSCode AI** | Lê do workspace | Não |

**Quando o contexto exigir o material:** referenciar explicitamente o caminho (`@handbook/guidelines/bradesco_guideline/...`) na conversa pra forçar a IA a abrir.

**Quando NÃO usar:** ao escrever código que será commitado — não copiar trechos de PDFs com copyright; usar apenas como referência de comportamento esperado da API/protocolo.
