# Implementation Plan: Conta Cedente para Conciliação Bancária (extensão do agregado)

**Branch**: `019-fin-recon-cedente-account` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/019-fin-recon-cedente-account/spec.md`

## Summary

Estender o agregado **existente** `fin_cedente_accounts` (criado pela 016/CNAB) com os campos de conciliação (`tipo`, `apelido`, `bankName`, `saldoAberturaCents`, `dataSaldoAbertura`), adicionar os use-cases `create/edit/close` + `list`, expor a borda HTTP de CRUD + encerrar, registrar a permissão `bank-account:read|write` e completar o guard `account-closed` no import de extrato. **Reuso máximo**: domínio/tabela/port/repos/mapper já existem; a migration `0009` é um `ALTER TABLE ADD COLUMN` **nullable** (não-quebrante) + índice único de FR-016. Abordagem técnica detalhada em [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 6.0, Node.js 24 LTS, ESM (`NodeNext`), strict completo (ADR-0009)

**Primary Dependencies**: Drizzle ORM 0.45.x + `mysql2` (MySQL 8.4 — ADR-0013/0020); Fastify 5 + Zod na borda (ADR-0027/0037); `node:test` + `--experimental-strip-types`

**Storage**: MySQL 8.4 — tabela `fin_cedente_accounts` **já existente** (migration `0004`), prefixo `fin_*` (ADR-0014)

**Testing**: `node:test` (unit, in-memory) + `pnpm run test:integration` (MySQL via Docker, opt-in) para a migration/índice único

**Target Platform**: Linux server (container) — modular monolith, módulo `financial`

**Project Type**: web-service (borda HTTP Fastify) dentro do modular monolith

**Performance Goals**: N/A — CRUD de baixo volume (poucas contas por organização)

**Constraints**: extensão **não-quebrante** das linhas da 016; sem `ENUM`/`JSON` nativo (ADR-0020); Money em `bigint` cents; sem evento de outbox

**Scale/Scope**: dezenas de contas cedente por tenant; 5 endpoints HTTP; 1 migration ALTER

## Constitution Check

_GATE: deve passar antes da Phase 0. Re-checar após a Phase 1._

- **ADR-0014 (isolamento por prefixo)**: ✅ toca **apenas** `fin_*` (módulo financial). Sem cross-módulo.
- **ADR-0006 (modular monolith / public-api)**: ✅ a permissão é exposta via `src/modules/financial/public-api/permissions.ts`; nenhum import de `domain/`/`application/` de outro módulo.
- **ADR-0020 (MySQL único — lista normativa)**: ✅ citação literal `handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md:93` — `ON DUPLICATE KEY UPDATE` é **permitido** ("Sem SQLite, é a sintaxe canônica … SQL bruto não é mais bloqueio"); `tipo` via `VARCHAR(16) + CHECK` e **não** `ENUM` (`:104`); `saldoAberturaCents` em `BIGINT` (`:67`); **sem** colunas JSON (`:102`).
- **ADR-0027/0037 (borda HTTP Fastify+Zod, contract-first)**: ✅ ativa; rotas novas seguem o padrão de `plugin.ts` (preHandler `requireAuth` + `authorize`).
- **Princípio IX (citação canônica de fronteira/consistência)**: ⚠️ **PENDENTE** — MCP `acdg-skills` off e base local `acdg/skills_base/shared-references/` ausente nesta sessão. Ancorar **Evans** (invariante de agregado) e **Vernon** (consistency boundary) quando disponível. Mitigação: a decisão de **estender** o agregado **não cria** uma fronteira nova (é o mesmo agregado/identidade), então o risco de fronteira é baixo.

**Resultado do gate**: **PASS** (sem violação que exija Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/019-fin-recon-cedente-account/
├── plan.md              # este arquivo
├── research.md          # Phase 0 — decisões técnicas + alternativas
├── spec.md              # specify + clarify
└── checklists/requirements.md
```

### Source Code (repository root) — caminhos reais

```text
src/modules/financial/
├── domain/cedente/
│   ├── types.ts                       # ESTENDER: tipo, apelido, bankName, saldoAberturaCents, dataSaldoAbertura
│   ├── cedente-account.ts             # ESTENDER: create() valida novos campos; novo erro de par saldo+data
│   └── cedente-account-id.ts          # reuso (sem mudança)
├── application/
│   ├── ports/cedente-account-store.ts # ADD: list(); (opcional) findByNaturalKey() p/ FR-016
│   └── use-cases/
│       ├── create-cedente-account.ts  # NOVO
│       ├── edit-cedente-account.ts    # NOVO (aplica imutabilidade FR-008)
│       ├── close-cedente-account.ts   # NOVO (reusa domain close())
│       ├── list-cedente-accounts.ts   # NOVO (read)
│       └── import-bank-statement.ts   # ESTENDER: guard account-closed (FR-011)
├── adapters/
│   ├── http/
│   │   ├── plugin.ts                  # ADD: 5 rotas cedente-accounts
│   │   ├── schemas.ts                 # ADD: create/edit body + idParam (Zod)
│   │   ├── dto.ts                     # ADD: cedenteAccountToDto
│   │   └── composition.ts             # ADD: wiring dos 4 use-cases (cedenteStore já plugado)
│   └── persistence/
│       ├── schemas/mysql.ts           # ADD: 5 colunas + CHECK(tipo) + UNIQUE(bank,agency,acct,digit)
│       ├── mappers/cedente-account.mapper.ts  # mapear novos campos (toRow/toDomain)
│       ├── repos/cedente-account-store.drizzle.ts    # ADD: list()
│       ├── repos/cedente-account-store.in-memory.ts  # ADD: list()
│       └── migrations/mysql/0009_*.sql            # ALTER TABLE ADD COLUMN (nullable) + CREATE UNIQUE INDEX
└── public-api/permissions.ts          # ADD: bankAccountRead / bankAccountWrite

tests/modules/financial/               # W0 RED (unit + http inject + integração da migration)
```

**Structure Decision**: módulo único `financial`, **estendendo arquivos existentes** (sem novo BC, sem novo agregado). O `cedenteStore` já está injetado no `composition.ts` (linhas 162/198) — só faltam os use-cases e as rotas.

## Complexity Tracking

> Sem violação da constituição — seção não aplicável (N/A).

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [ ] tabelas novas · [x] colunas · [x] índices · [ ] FKs
  - 5 colunas **NULLABLE** em `fin_cedente_accounts`: `type VARCHAR(16)`, `nickname VARCHAR(60)`, `bank_name VARCHAR(80)`, `opening_balance_cents BIGINT`, `opening_balance_date DATE`.
  - `CHECK (type IN ('corrente','poupanca','investimento'))` (via `check()` no schema).
  - `UNIQUE INDEX` em (`bank_code`, `agency`, `account_number`, `account_digit`) — FR-016.
- **Prefixo de isolamento correto?** `fin_*` — ✅ ADR-0014.
- **Outbox**: novo evento? **Não** — CRUD local, sem evento cross-módulo.
- **Comando**: editar `adapters/persistence/schemas/mysql.ts` → `pnpm run db:generate:financial` → versionar `0009_*.sql`. Colunas novas não são UUID → **sem** `COLLATE utf8mb4_bin` manual.
- **Restrições MySQL 8 (ADR-0020)**: `type` é `VARCHAR(16) + CHECK` (não `ENUM`, `:104`); saldo é `BIGINT` cents (`:67`); **sem** JSON (`:102`).
- **⚠️ Pré-condição do índice único (FR-016)**: o `CREATE UNIQUE INDEX` falha se já houver duplicatas (banco+agência+conta+dígito) nas linhas criadas pela 016. O W0 deve cobrir isso: ou a migration valida/aborta com mensagem clara, ou assume-se base sem duplicatas (dev) e documenta-se a verificação manual em produção.

## Contrato HTTP (Fastify + Zod — ADR-0027/0037)

Namespace: `/api/v2/financial/cedente-accounts`. Todas com `preHandler: [requireAuth, authorize(...)]`.

| Método | Rota                          | Permissão            | Sucesso         | Erros principais                                                           |
| ------ | ----------------------------- | -------------------- | --------------- | -------------------------------------------------------------------------- |
| POST   | `/cedente-accounts`           | `bank-account:write` | 201 + location  | 400 validação · 409 `cedente-account-duplicate` (FR-016)                   |
| GET    | `/cedente-accounts`           | `bank-account:read`  | 200 (lista DTO) | —                                                                          |
| GET    | `/cedente-accounts/:id`       | `bank-account:read`  | 200 (DTO)       | 404 `cedente-account-not-found`                                            |
| PATCH  | `/cedente-accounts/:id`       | `bank-account:write` | 200 (DTO)       | 404 · 409 `cedente-account-bank-data-locked` (FR-008, conta com histórico) |
| POST   | `/cedente-accounts/:id/close` | `bank-account:write` | 200 (DTO)       | 404 · 409 `cedente-account-already-closed` (guard existente)               |

- **Schemas Zod** (em `schemas.ts`): `type` = `z.enum(['corrente','poupanca','investimento'])`; `openingBalanceCents` = `centsStringSchema` **opcional** + `openingBalanceDate` = `z.iso.date()` **opcional**, com `.refine()` exigindo os dois juntos ou nenhum (FR-006); `nickname`/`bankName` strings com bounds (60/80). `:id` = `z.uuid()`.
- **DTO** (em `dto.ts`): `cedenteAccountToDto` — saldo cents→string, data→ISO `YYYY-MM-DD`, `id`→`String(id)`, `status` preservado (`Active`/`Closed`).
- **Backward-compat**: rotas **novas** sob o namespace `v2` já existente; sem versionamento adicional. Contas da 016 sem os campos novos serializam com os campos ausentes/null.

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **M** — estende agregado + 4 use-cases + 5 rotas + 1 migration; **sem** BC novo, **sem** outbox, **com** reuso pesado (domínio/repos/mapper/erro `account-closed` já existem).
- **Justificativa**: o trabalho é localizado e aditivo; o risco concentra-se na semântica create-vs-edit (não reusar `save()` upsert cego para create — ver research.md D2) e na pré-condição do índice único (FR-016). Pode ser fatiado em 2 tickets se a borda crescer: `FIN-RECON-CEDENTE-DOMAIN-APP` (domínio + use-cases + migration) e `FIN-RECON-CEDENTE-HTTP` (borda + permissão). Recomendação: **1 ticket M** salvo se o review pedir fatiamento.
- **Plano de testes W0 (RED)** — suites `*.test.ts` que devem falhar primeiro:
  1. `domain/cedente`: `create()` com novos campos; rejeita `type` inválido; rejeita saldo sem data (par coeso, FR-006).
  2. `application`: `create` (rejeita duplicata FR-016), `edit` (trava dados bancários com histórico — FR-008), `close` (reusa domain), `list`.
  3. `application`: `import-bank-statement` rejeita conta encerrada com `account-closed` (FR-011) — hoje **não** rejeita.
  4. `adapters/http` (via `fastify.inject`): POST/GET/GET:id/PATCH/close com permissão + validação + status codes da tabela acima.
  5. **integração** (`test:integration`): `UNIQUE INDEX` rejeita inserir conta duplicada; contas legadas (sem campos novos) continuam carregando (`toDomain`).

```

```
