---
título: "Status atual do projeto `core-api` — snapshot do pé do código"
data: 2026-05-19
escopo: "src/, tests/, .claude/.pipeline/, handbook/architecture/, handbook/domain/"
propósito: "fotografia do estado real do código no dia 2026-05-19, sem incorporar o refactor planejado na entrevista 0001"
não_cobrre: "decisões em fila aguardando execução (vide handbook/interviews/0001-functional-ddd-domain-refresh.md)"
---

# Status atual do `core-api` (snapshot 2026-05-19)

> **Propósito:** fotografia estática do código tal como está hoje. **Não** incorpora as 105 decisões da entrevista 0001 — aquelas estão em fila como 21 tickets futuros. Aqui é só o pé do projeto.

---

## TL;DR

- **Stack:** Node 24 + TS 6.0 + ESM/NodeNext + pnpm. Drizzle 0.45 + mysql2 3.22 como **únicas** deps de runtime.
- **Código de produção:** ~**3.860 LOC** em 67 arquivos TS dentro de `src/`.
- **Testes:** ~**7.815 LOC** em 38 arquivos TS dentro de `tests/`. Test runner nativo do Node (`node --test --experimental-strip-types`).
- **Módulo entregue:** **1 de N planejados** — `contracts` (Contratos + Aditivos) com domain, application, adapters (in-memory + Drizzle/MySQL), CLI completa em PT-BR.
- **Tickets executados na pipeline:** **28 pastas** em `.claude/.pipeline/`, **21 chegaram a W3** (typecheck + format + test verdes).
- **ADRs aceitos:** **19 ADRs** (0001-0015, 0017-0020). ADR-0020 vigente; ADR-0018 superseded.
- **CLI primária funcionando:** P.O. usa via `pnpm run cli:contracts -- <subcomando>` com drivers `memory` (default) e `mysql` (Docker compose).
- **Sem HTTP server.** Sem BFF. Comunicação cross-módulo ainda não materializada (Bloco F da entrevista 0001 aguardando).

---

## Stack vigente (do `package.json`)

```json
"engines":      { "node": ">=24.0.0" },
"type":         "module",
"imports":      { "#src/*": "./src/*" },
"dependencies": {
  "drizzle-orm": "^0.45.2",
  "mysql2":      "^3.22.3"
},
"devDependencies": {
  "@eslint/js":                       "^10.0.1",
  "@types/node":                      "^22.10.0",
  "@typescript/native-preview":       "7.0.0-dev.20260515.1",
  "drizzle-kit":                      "^0.31.10",
  "eslint":                           "^10.3.0",
  "eslint-config-prettier":           "^10.1.8",
  "prettier":                         "^3.8.3",
  "typescript":                       "^6.0.0",
  "typescript-eslint":                "^8.59.3"
}
```

Scripts ativos: `typecheck`, `lint`, `lint:fix`, `format`, `format:check`, `test`, `test:integration` (com docker compose), `cli:contracts`, `db:generate`, `secrets:setup`.

---

## Estrutura de `src/` (67 arquivos, ~3.860 LOC)

### `src/shared/` — utilitários cross-module

```
src/shared/
├── brand.ts                 # Brand<T, K> = T & { __brand: K } (intersection — sem unique symbol)
├── id.ts                    # newUuid + isUuidV4
├── index.ts                 # barrel
├── result.ts                # Result<T, E> + ok + err (sem mapErr, sem combine)
├── ports/clock.ts           # Clock port — mora em src/shared/ports/ (não em modules/<bc>/application/ports/)
├── adapters/clock-real.ts   # implementação real
├── adapters/clock-fixed.ts  # implementação para testes
└── utils/{date,string}.ts   # isValidDate + isBlank
```

### `src/modules/contracts/` — único módulo entregue (Fase 1)

```
src/modules/contracts/
├── domain/                          # Domínio puro (~750 LOC)
│   ├── shared/
│   │   ├── money.ts                 # VO Money + smart constructor + add/sub/equals
│   │   ├── period.ts                # VO Period com union { Fixed | Indefinite }
│   │   ├── ids.ts                   # ContractId, AmendmentId, DocumentId, UserRef (4 brands)
│   │   ├── bucket-name.ts           # VO infra (aponta pra S3)
│   │   ├── storage-key.ts           # VO infra (aponta pra S3)
│   │   └── storage-ref.ts           # { bucket, key } composição
│   │
│   ├── contract/
│   │   ├── types.ts                 # ContractShape + Brand<…, 'Contract'> + ContractAdjustment union
│   │   ├── events.ts                # ContractEvent: Created | Ended | StateUpdated
│   │   ├── errors.ts                # ContractError: string literal union (kebab-case)
│   │   └── contract.ts              # 4 ops: create, expire, terminate, applyHomologatedAdjustment
│   │
│   └── amendment/
│       ├── types.ts                 # AmendmentBase & AmendmentVariant (intersection)
│       ├── events.ts                # AmendmentEvent
│       ├── errors.ts                # AmendmentError: string literal union
│       └── amendment.ts             # 3 ops: create, attachSignedDocument, homologate
│
├── application/
│   ├── ports/                       # TODOS os ports moram aqui (sem distinção)
│   │   ├── contract-repository.ts
│   │   ├── amendment-repository.ts
│   │   ├── document-storage.ts
│   │   └── event-bus.ts
│   └── use-cases/                   # 6 use cases factory functions
│       ├── create-contract.ts
│       ├── create-amendment.ts
│       ├── attach-signed-document.ts
│       ├── homologate-amendment.ts
│       ├── get-contract.ts
│       └── list-contracts.ts
│
├── adapters/                        # Convenção `adapters/` (não `infra/`)
│   ├── amendment-repository.in-memory.ts
│   ├── contract-repository.in-memory.ts
│   ├── event-bus.in-memory.ts
│   └── persistence/                 # Drizzle / MySQL
│       ├── drivers/mysql-driver.ts  # pool + transaction + tuning
│       ├── mappers/{amendment, contract, money, period}.mapper.ts
│       ├── repos/{amendment, contract}-repository.drizzle.ts
│       └── schemas/mysql.ts         # schema MySQL com prefixo `ctr_*`
│
└── cli/                             # CLI primária (UX da P.O.) — PT-BR
    ├── main.ts                      # entrypoint
    ├── registry.ts                  # mapa subcomando → módulo
    ├── parse-flags.ts               # parser genérico de flags
    ├── parse-driver-flags.ts        # --driver memory|mysql + --connection-string
    ├── context.ts                   # CliContext (ports injetados)
    ├── state.ts                     # state file JSON para driver memory
    ├── drivers/{memory, mysql}.ts   # cada driver constrói ports
    ├── commands/                    # 6 subcomandos:
    │   ├── criar-contrato.ts
    │   ├── criar-aditivo.ts
    │   ├── anexar-documento.ts
    │   ├── homologar-aditivo.ts
    │   ├── listar-contratos.ts
    │   ├── mostrar-contrato.ts
    │   └── _flag-errors.ts          # erros compartilhados
    └── formatters/                  # tudo em PT-BR
        ├── {date, money, period, status}.ts
        ├── {contract, amendment, error}.ts
        ├── sanitize.ts
        └── index.ts
```

**Não existe (ainda):**
- `src/modules/contracts/public-api/` — não há comunicação cross-módulo materializada.
- `src/modules/<outros>/` — só `contracts` está entregue.
- `src/shared/kernel/` — não há separação cross-BC.
- HTTP server, BFF, Gateway — toda interação é via CLI.

---

## Estrutura de `tests/` (38 arquivos, ~7.815 LOC)

```
tests/
├── modules/contracts/
│   ├── domain/
│   │   ├── shared/{money, period, ids, bucket-name, storage-key, storage-ref}.test.ts
│   │   ├── contract/contract.test.ts
│   │   └── amendment/amendment.test.ts
│   ├── application/
│   │   ├── ports/document-storage.contract.ts            # contract test reusável
│   │   └── use-cases/{create-contract, create-amendment, attach-signed-document, homologate-amendment, queries}.test.ts
│   ├── adapters/persistence/
│   │   ├── contract-repository.suite.ts                  # suite reusável (não roda direto)
│   │   ├── amendment-repository.suite.ts
│   │   ├── contract-repository.shape.test.ts
│   │   ├── drizzle-mysql.test.ts
│   │   ├── inmemory.test.ts
│   │   ├── mysql-driver.test.ts
│   │   ├── mysql-driver-tuning.test.ts
│   │   ├── schema-hardening.test.ts
│   │   ├── schemas/mysql.test.ts
│   │   ├── migrations/mysql.test.ts
│   │   └── fixtures.ts
│   └── cli/{format, parse-flags, parse-driver-flags, state}.test.ts
│
├── cli/                                                  # E2E da CLI
│   ├── contracts.cli.test.ts                             # E2E memory + state file
│   ├── contracts.cli.mysql.test.ts                       # E2E MySQL (gated por MYSQL_INTEGRATION=1)
│   └── helpers/{extract, run-cli, temp-state}.ts
│
├── infra/mysql-compose.test.ts                           # smoke do docker compose
├── cleanup/{docs-update, sqlite-removal}.test.ts         # regressão pós-ADR-0020
└── regression/reports-2026-05-15.test.ts                 # regressão de outputs
```

**Convenção:** apenas `*.test.ts` é descoberto. `*.suite.ts` e `*.contract.ts` são parametrizáveis (consumidos por outros tests).

**Cobertura conhecida:** 7 VOs + 2 agregados + 6 use cases + 2 repositórios drizzle + 1 contract test (port) + CLI E2E completa em memory e MySQL + smoke do compose.

---

## Pipeline executada — 28 tickets em `.claude/.pipeline/`

**21 tickets chegaram a W3 (typecheck + format + test verdes).** Os 7 restantes estão em fases intermediárias ou são pastas históricas.

### Grupos cronológicos

#### Fundação do domínio (VOs e agregados)

- `CTR-VO-MONEY` — Money + smart constructor + erro `'money-*'`
- `CTR-VO-PERIOD` — Period com union { Fixed | Indefinite }
- `CTR-VO-IDS` — ContractId, AmendmentId, DocumentId, UserRef
- `CTR-AGG-CONTRACT` — Contract com state machine simples (Active | Expired | Terminated)
- `CTR-AGG-AMENDMENT` — Amendment com 4 kinds (Addition, Suppression, TermChange, Misc) e 2 status (Pending, Homologated)
- `CTR-STORAGE-PORT` — DocumentStorage port + BucketName, StorageKey, StorageRef

#### Use cases

- `CTR-USECASE-CREATE-CONTRACT`
- `CTR-USECASE-CREATE-AMENDMENT`
- `CTR-USECASE-ATTACH-DOCUMENT`
- `CTR-USECASE-HOMOLOGATE-AMENDMENT`
- `CTR-USECASE-QUERIES` — getContract + listContracts

#### CLI da P.O.

- `CTR-CLI-MVP` — main, registry, 6 subcomandos, formatters PT-BR
- `CTR-CLI-DRIVER-FLAG` — flag `--driver memory|sqlite|mysql`
- `CTR-CLI-E2E-TESTS` — `contracts.cli.test.ts`
- `CTR-CLI-MYSQL-SMOKE` — `contracts.cli.mysql.test.ts`

#### Persistência (Drizzle + SQLite + MySQL)

- `CTR-ADAPTER-DRIZZLE-DUAL` — adapter Drizzle/SQLite (depois removido em CTR-CLEANUP-SQLITE)
- `CTR-DB-COMPOSE-MYSQL` — `compose.yaml` com mysql 8.4 + healthcheck
- `CTR-DB-SCHEMA-MYSQL-CTR-PREFIX` — `ctr_*` no DB `core`
- `CTR-DB-MIGRATION-MYSQL` — Drizzle Kit + primeira migration
- `CTR-DB-DRIVER-MYSQL` — wire `mysql2` com pool + transaction
- `CTR-DB-DRIVER-POOL-TUNING` — config de pool refinada
- `CTR-DB-SCHEMA-HARDENING` — charset, índices, CHECKs
- `CTR-DB-REPO-LIST-N1` — corrige N+1 em `list-contracts`
- `CTR-DB-MAPPER-NO-THROW` — substitui 4 `throw` em `default` exhaustive por `return _`
- `CTR-INFRA-MYSQL-HEALTHCHECK-TCP` — healthcheck TCP em vez de mysqladmin

#### Cleanup pós ADR-0020

- `CTR-CLEANUP-SQLITE` — remove SQLite, `better-sqlite3`, schemas/drivers paralelos
- `CTR-DOCS-UPDATE-FOR-ADR-0020` — atualiza CLAUDE.md raiz + 8 SKILLs

#### Defects corrigidos

- `CTR-DEFECTS-CRITICAL`
- `CTR-DEFECTS-MEDIUM`

---

## ADRs vigentes (19 aceitos)

Em `handbook/architecture/adr/`:

| ID | Tema | Status |
| :---: | :--- | :--- |
| 0001 | Strangler fig sobre rewrite | Accepted |
| 0002 | Manter Node.js como runtime | Accepted |
| 0003 | Shared DB com schemas isolados | Accepted |
| 0004 | Outbox pattern em Postgres | Superseded (vide 0015) |
| 0005 | Thin BFF gateway | Accepted |
| 0006 | **Modular monolith `core-api`** | **Accepted (vigente)** |
| 0007 | Multi-cloud AWS + GCP | Accepted |
| 0008 | Integração Bradesco | Accepted |
| 0009 | **Node 24 + TS 6 + roadmap TS 7** | **Accepted (vigente)** |
| 0010 | Email port-adapter pattern | Accepted |
| 0011 | Supply chain hardening | Accepted |
| 0012 | **pnpm como package manager** | **Accepted (vigente)** |
| 0013 | **MySQL database engine** | **Accepted (supersede pelo 0014/0020)** |
| 0014 | MySQL database isolation (prefixos `ctr_*`/`fin_*`) | Accepted |
| 0015 | **Outbox pattern em MySQL** | **Accepted (futuro)** |
| 0017 | Correlation keys cross-period audit | Accepted |
| 0018 | Persistência dual-dialect (Drizzle SQLite+MySQL) | **Superseded by 0020** |
| 0019 | **Document storage S3 (prod) + MinIO (dev)** | **Accepted (vigente)** |
| 0020 | **MySQL único** (supersede 0018) | **Accepted (vigente)** |

ADR-0016 está omitido na sequência (provavelmente reservado ou pulado).

---

## Domínio formalizado (em `handbook/domain/`)

- `01-introduction.md` — escopo do BC Contratos.
- `02-context-map.md` — relacionamentos.
- `03-gestao-contratos-context.md` — regras do Contrato.
- `04-aditivos-context.md` — regras do Aditivo (4 kinds + state machine).
- `05-timeline-context.md` — eventos temporais.
- `06-event-line-context.md` — eventos de domínio.
- `07-external-context.md` — integrações externas.
- `DOCUMENTO_MESTRE.md` — overview do BC.

E em `handbook/domain/contratos/`: 11 documentos detalhados com RNs e RNFs ratificadas pela P.O.

---

## Quality gates atuais

- **TypeScript:** `tsc --noEmit` — passa hoje (último `CTR-DB-MAPPER-NO-THROW` W3 verde em 2026-05-15).
- **Prettier:** `prettier --check .` — passa.
- **ESLint:** flat config com `typescript-eslint` strict + stylistic + type-checked. Regras críticas: `no-throw-literal`, `no-classes` via `no-restricted-syntax`, `switch-exhaustiveness-check`, `no-explicit-any`, `prefer-readonly`.
- **Node test runner:** `node --test --experimental-strip-types --no-warnings tests/**/*.test.ts` — passa.
- **Integração MySQL:** `pnpm run test:integration` provisiona compose + roda tests gated por `MYSQL_INTEGRATION=1`. Passa.
- **Pre-commit hook:** `.claude/hooks/pre-commit-typecheck.sh` bloqueia commit se `tsc --noEmit` falhar.

---

## Débito técnico conhecido (estado, não plano)

Coisas que **estão como estão hoje** — independente do que a entrevista 0001 planejou. Este snapshot **não** propõe correção; apenas registra o pé.

### Domínio

- **Casts `as unknown as T` espalhados:** 8 ocorrências em `contract/contract.ts`, 4 em `amendment/amendment.ts`, 4 em `money.ts`, 2 em `period.ts`, 4 em `ids.ts`. Padrão atual do Brand.
- **`Brand<T, K>` em `shared/brand.ts`** usa intersection com phantom string `__brand: K` — não `unique symbol`.
- **Erros são string literal unions** (`'contract-not-active' | 'contract-cannot-expire-yet' | …`) — sem payload contextual.
- **`Amendment` é intersection `Base & Variant`** com 3 campos `... | null` (optional-as-state): `signedDocumentRef`, `homologatedAt`, `homologatedBy`.
- **Agregados brandados:** `Contract`, `Amendment` ambos usam `Brand<…, 'Contract'>` / `Brand<…, 'Amendment'>`.
- **`Date` cru no domínio:** `Period.start/end`, `Contract.signedAt`, `Amendment.createdAt`, etc. `assertValidEventDate` aparece em ~5 lugares.
- **`assertActive(c): Result<Contract, 'contract-not-active'>`** retorna `Contract` cru no `ok` — sem refinement.
- **1 `throw new Error`** em `application/use-cases/homologate-amendment.ts:72` (no `default` exhaustive). Os 4 throws dos mappers Drizzle já foram removidos no `CTR-DB-MAPPER-NO-THROW`.

### Application

- **Todos os ports moram em `application/ports/`** (`contract-repository`, `amendment-repository`, `document-storage`, `event-bus`).
- **`Clock` port mora em `src/shared/ports/clock.ts`** com adapters em `src/shared/adapters/` — diferente do padrão de outros ports.
- **Use cases retornam `Promise<Result<T, E>>`** — composição manual com `if (!result.ok) return result`.

### Shared

- **`shared/result.ts`** exporta apenas `ok`, `err`, `Result<T, E>` — sem `mapErr`, `combine`, `isOk`, `isErr`.
- **Sem `shared/kernel/`** — separação cross-BC ainda não existe.
- **Sem `shared/immutable.ts`** — `Object.freeze` não é usado em constantes (Money não tem `ZERO`).

### Adapters / Persistence

- **Mappers Drizzle reidratam agregado** via `as unknown as Contract` direto (não via smart constructors de VOs). Resultado pode emitir `RehydrationError` apenas em casos extremos (UUID inválido).
- **In-memory adapters** existem para os 3 ports (`*-repository.in-memory.ts`, `event-bus.in-memory.ts`).
- **`storage` adapter real ainda não foi materializado** — `DocumentStorage` port existe, mas implementação S3/MinIO está pendente.

### CLI

- **6 subcomandos em PT-BR funcionando:** `criar-contrato`, `criar-aditivo`, `anexar-documento`, `homologar-aditivo`, `listar-contratos`, `mostrar-contrato`.
- **2 drivers:** `memory` (default + state file JSON) e `mysql` (pool real).
- **Formatters PT-BR** completos: date, money, period, status, error, contract, amendment.

### Outros módulos / infra futura

- **Apenas `contracts` está entregue.** Financeiro, Faturamento, Pagamento — todos planejados em `handbook/domain/` e `handbook/inquiries/`, sem código ainda.
- **Outbox MySQL (ADR-0015)** — planejado, sem código.
- **BFF / HTTP server (ADR-0005)** — planejado, sem código.
- **`public-api/` por módulo** — pasta não existe ainda; eventos cross-módulo aguardam outbox.

---

## Skills e agentes

- **19 SKILLs** em `.claude/skills/`: ts-domain-modeler, ports-and-adapters, modular-monolith, pipeline-maestro, code-reviewer, ts-quality-checker, tdd-tutor/strategist/theorist, clean-code-tutor/reviewer/theorist, database-tutor/engineer/theorist, nodejs-process-runner, nodejs-fs-scripter, drizzle-schema-author, application-cli-builder.
- **4 AGENTs** em `.claude/agents/`: ponto de entrada `contratos-orchestrator` + sub-agents.

---

## Reviews realizados (em `handbook/reviews/`)

- `0001-revisao-refatoracao-migracao-segura.md` — audit de migração SQLite→MySQL.
- `0002-audit-adapters-persistence-mysql.md` — audit dos adapters MySQL/Drizzle pós-ADR-0020. Gerou `CTR-DB-MAPPER-NO-THROW` como warm-up.

---

## Inquiries em aberto (em `handbook/inquiries/`)

- `0001-modular-monolith-vs-microservices.md`
- `0002-bradesco-van-architecture.md`
- `0003-multi-cloud-strategy.md`
- `0004-node-version-and-typescript-future.md`
- `0005-supply-chain-axios-and-dependency-hardening.md`
- `0006-package-manager-pnpm-vs-bun.md`
- `0007-http-framework-fastify-vs-express.md`
- `0008-postgres-driver-pg-vs-postgres.md`
- `0009-email-strategy-nodemailer-with-adapter.md`
- `0010-mysql-engine-correction.md`
- `0011-auditoria-fiscal-cross-periodo.md`
- `0012-bff-managed-api-gateway-vs-fastify.md`
- `0013-local-dev-simulator-and-ci.md`
- `0014-schema-legado-vs-modelo-alvo.md`
- `0015-charset-drizzle-roadmap.md`
- Mais `PERGUNTAS-EM-ABERTO.md` e `_template.md`.

---

## Roadmap em aberto (referência — não escopo deste snapshot)

A **entrevista 0001** (`handbook/interviews/0001-functional-ddd-domain-refresh.md`, fechada em 2026-05-19) destilou **21 tickets de refactor** do domínio + **3 SKILLs refresh**, classificados em 105 entradas DO/CONSIDER/AVOID/DON'T. Esses tickets **ainda não foram abertos na pipeline** — vão entrar quando o time decidir começar o refactor.

Top-3 por leverage (do PhD da entrevista, em L2):

1. State Machine em Tipos (Contract + Amendment).
2. Parse, don't validate (VO canônico + Brand unique symbol + immutable).
3. Zero throw / Result Homemade (combinators + compose refactor).

Esses 21 tickets representam **mudança radical** no domínio. **Este snapshot é o "antes"**.

---

## Métricas finais

| Métrica | Valor |
| :--- | ---: |
| Arquivos TS em `src/` | 67 |
| LOC em `src/` | ~3.860 |
| Arquivos TS em `tests/` | 38 |
| LOC em `tests/` | ~7.815 |
| Tickets na pipeline | 28 |
| Tickets em W3 verde | 21 |
| ADRs aceitos | 19 |
| Inquiries em aberto | 15 |
| Reviews fechados | 2 |
| Módulos entregues | 1 (`contracts`) |
| SKILLs em `.claude/skills/` | 19 |
| Agents em `.claude/agents/` | 4 |
| Dependências de runtime | 2 (`drizzle-orm`, `mysql2`) |
