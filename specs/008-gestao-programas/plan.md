# Implementation Plan: Gestão de Programas

**Branch**: `008-gestao-programas` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-gestao-programas/spec.md`

## Summary

Novo módulo `programs` (Bounded Context autônomo) no modular monolith do core-api, expondo CRUD + ciclo de vida (ativar/desativar/reativar) de **Programa** pela borda HTTP (`/api/v1/programs`, Fastify + Zod/OpenAPI). O agregado `Program` tem identidade dupla — `id` UUID v4 (PK de domínio, referência cross-módulo) + `program_number` sequencial interno auto-gerado (UNIQUE) — sigla única (case-insensitive), status `ATIVO|INATIVO` com transições controladas, logo opcional em object storage (S3/MinIO), concorrência por optimistic-lock (`version`) e auditoria via eventos no outbox. Replica fielmente a anatomia do módulo `contracts` (domain/application/adapters/public-api), com as divergências justificadas na seção Complexity Tracking.

## Technical Context

**Language/Version**: TypeScript 6.0 (ESM, NodeNext) sobre Node.js 24 LTS

**Primary Dependencies**: Fastify 5 + `fastify-zod-openapi` (borda), Zod 4 (schemas de borda), Drizzle ORM 0.45 + `mysql2` (persistência), `@aws-sdk/client-s3` (logo storage — ADR-0019), `node:test` (testes)

**Storage**: MySQL 8.4 (tabelas `prg_programs`, `prg_outbox`) + object storage S3/MinIO para binário do logo

**Testing**: `node:test` + `--experimental-strip-types`; unit de domínio (puro), rota HTTP via `fastify.inject` (driver `memory`), persistência via suite parametrizada (InMemory + Drizzle/MySQL), integração HTTP real via coleções Bruno (ADR-0034)

**Target Platform**: processo único Node (modular monolith), Linux container

**Project Type**: web-service (backend HTTP) dentro de monólito modular

**Performance Goals**: OLTP de ERP — volume baixo (dezenas a centenas de programas); sem alvo de throughput específico (SC focam em correção, não latência)

**Constraints**: domínio puro (sem classes/throw), `Result<T,E>`, idioma EN no código / PT nas strings ao humano; MySQL sem JSON nativo/ENUM/trigger/stored-proc/AUTO_INCREMENT em PK (ADR-0018/0020)

**Scale/Scope**: 1 agregado (`Program`), 3 VOs (`Sigla`, `ProgramStatus`, `Logo`), 4 eventos, 6 use cases, 6–7 endpoints HTTP, 2 tabelas

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                                  | Status         | Observação                                                                                                  |
| ------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3                               | ✅             | Ticket size **L**; W0 RED descrito em "Estimativa de Pipeline".                                             |
| II. Regressão zero                         | ✅             | Gate W3 (`typecheck`+`format:check`+`lint`+`test`) antes de fechar.                                         |
| III. pnpm único                            | ✅             | Nenhuma dep nova exigida (todas já no projeto).                                                             |
| IV. Modular Monolith isolado               | ⚠️ justificado | **Novo módulo** `programs` (`prg_*`). Cross-módulo só por `public-api/` + outbox. Ver Complexity Tracking.  |
| V. Domínio puro                            | ✅             | Funções + `Readonly` + smart constructors + `Result`; erros string-union EN.                                |
| VI. MySQL+Drizzle, migrations geradas      | ✅             | `prg_programs`/`prg_outbox` via Drizzle; `pnpm run db:generate`; sem features proibidas.                    |
| VII. HTTP-first (CLI aposentada, ADR-0037) | ✅             | Entrega borda HTTP `/api/v1/programs`; **sem** novo `cli:*`.                                                |
| VIII. TS strict + ESM + idioma             | ✅             | `import type`, `.ts` nos imports, `#src/*`, EN/PT por camada.                                               |
| IX. Decisões ancoradas (citação ≥4 linhas) | ✅             | BC/agregado (Evans/Vernon), identidade/chaves (Ramakrishnan), teste (Beck) em [research.md](./research.md). |

**Resultado**: PASS com uma violação justificada (IV — módulo novo).

## Project Structure

### Documentation (this feature)

```text
specs/008-gestao-programas/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões + citações canônicas
├── data-model.md        # Phase 1 — agregado, VOs, schema, eventos
├── quickstart.md        # Phase 1 — como rodar/testar o módulo
├── contracts/
│   └── programs-http.md  # Phase 1 — contrato dos endpoints REST
└── tasks.md             # Phase 2 — /speckit-tasks (NÃO criado aqui)
```

### Source Code (repository root)

```text
src/modules/programs/
├── domain/
│   ├── shared/
│   │   └── program-id.ts            # Brand<string,'ProgramId'> + generate/rehydrate
│   └── program/
│       ├── program.ts               # operações puras (create/update/deactivate/reactivate)
│       ├── types.ts                 # Readonly<{ Program }>
│       ├── sigla.ts                 # VO Sigla (normalização + validação)
│       ├── status.ts                # VO ProgramStatus + transições
│       ├── events.ts                # ProgramEvent union (EN passado)
│       ├── errors.ts                # string-literal union
│       └── repository.ts            # Port ProgramRepository (type)
├── application/
│   ├── ports/
│   │   ├── outbox.ts
│   │   └── logo-storage.ts          # Port para S3 (logo)
│   └── use-cases/
│       ├── create-program.ts
│       ├── list-programs.ts
│       ├── get-program.ts
│       ├── update-program.ts
│       ├── deactivate-program.ts
│       └── reactivate-program.ts
├── adapters/
│   ├── http/
│   │   ├── plugin.ts                # programsRoutes + programsHttpPlugin
│   │   ├── composition.ts           # buildProgramsHttpDeps
│   │   ├── schemas.ts               # Zod request/response
│   │   └── program-dto.ts           # Program → DTO
│   ├── persistence/
│   │   ├── drivers/mysql-driver.ts  # __drizzle_migrations_programs
│   │   ├── mappers/program-mapper.ts
│   │   ├── migrations/mysql/        # geradas por pnpm run db:generate
│   │   ├── repos/
│   │   │   ├── program-repository.drizzle.ts
│   │   │   ├── program-repository.in-memory.ts
│   │   │   └── outbox-repository.drizzle.ts
│   │   └── schemas/mysql.ts         # prg_programs, prg_outbox
│   └── storage/
│       ├── logo-storage.in-memory.ts
│       └── logo-storage.s3.ts
└── public-api/
    ├── events.ts                    # ProgramsModuleEvent + decoder versionado
    ├── http.ts                      # re-export plugin + buildProgramsHttpDeps
    ├── permissions.ts               # PROGRAM_PERMISSION
    └── index.ts

tests/modules/programs/
├── domain/program/program.test.ts
├── domain/program/sigla.test.ts
├── application/use-cases/*.test.ts
├── adapters/http/programs-writes.routes.test.ts
├── adapters/http/programs-list.routes.test.ts
└── adapters/persistence/{program-repository.suite.ts,inmemory.test.ts,drizzle-mysql.test.ts}
```

**Structure Decision**: módulo isolado `src/modules/programs/` espelhando a anatomia de `src/modules/contracts/` (referência mapeada no Explore). Catálogo global de permissões em `src/modules/auth/domain/authorization/permission-catalog.ts` recebe `program:*`. Borda registrada com **prefixo explícito `/api/v1`** (forma `{ plugin, prefix: '/api/v1' }` do `buildApp` — ADR-0033), **não** o default `/api/v2`: `programs` é **port do legado sem re-estudo de domínio** (ver nota de versionamento abaixo).

## Complexity Tracking

| Violação / Divergência                                                                         | Por que é necessária                                                                                                                                                            | Alternativa simples rejeitada porque                                                                                                |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Novo módulo `programs`** (4º+ BC de domínio)                                                 | "Programa" é conceito autônomo referenciado por `ProgramaID` em Financeiro/Conciliação/Documentos (handbook); não tem dono natural. Evans: external refs só à raiz do agregado. | Anexar a Contratos/Financeiro inverteria a dependência e ofenderia ADR-0014 (ver research D1).                                      |
| **Coluna `version` + optimistic-lock** (contracts não tem)                                     | SC-005 + FR-016 + US4-cenário4 exigem **rejeitar** gravação concorrente baseada em versão obsoleta.                                                                             | SELECT-FOR-UPDATE puro (padrão contracts) garante atomicidade mas é last-write-wins — não rejeita stale-write, descumprindo SC-005. |
| **`program_number` auto-gerado (MAX+1 sob FOR UPDATE)** (contracts recebe o número do cliente) | Em programas o número é interno/sequencial (FR-002b), nunca informado pelo usuário.                                                                                             | Receber do cliente (padrão contracts) não cabe: a UI não fornece número; ele reflete ordem de criação.                              |

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] tabelas novas (`prg_programs`, `prg_outbox`) · [x] colunas · [x] índices (UNIQUE sigla normalizada, UNIQUE `program_number`) · [ ] FKs (nenhuma cross-módulo) · [ ] —
- **Prefixo de isolamento correto?** `prg_*` — ADR-0014: **sim** (novo namespace).
- **Outbox**: novo evento exige `INSERT` em `prg_outbox` na mesma transação do `save` (append-in-tx, padrão contracts).
- **Comando**: após editar `schemas/mysql.ts`, rodar `pnpm run db:generate` e **editar o SQL gerado** para `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` + `COLLATE utf8mb4_bin` na coluna UUID (convenção do schema de contracts).
- **Restrições MySQL 8** (ADR-0020): status via `varchar(16)` + `CHECK IN ('ATIVO','INATIVO')` (sem ENUM nativo); sem JSON/trigger/stored-proc.

## Contrato HTTP (HTTP-first ATIVO — ADR-0037)

Base: `/api/v1/programs`. Auth obrigatória (`requireAuth`); autorização por permissão. Detalhe completo em [contracts/programs-http.md](./contracts/programs-http.md).

> **Versionamento `/api/v1` (não `/api/v2`).** Convenção do projeto: a borda nasce em **`/api/v1`** para todo **port do legado** cujo domínio **ainda não passou por re-estudo com especialistas** para reformular sintaxe/lógica da API legada. Só Contratos (`ctr_*`) e Financeiro (`fin_*`) — reformulados — vivem em `/api/v2`. `programs`, como Auth users/roles (specs 005/006), é port legado → **`/api/v1`** sinaliza "domínio espelhado do legado, sujeito a reformulação futura". Registro via prefixo explícito (ADR-0033). Uma futura promoção a `/api/v2` exigiria o re-estudo de domínio.

| Método | Rota                              | Permissão            | Sucesso           | Erros                        |
| ------ | --------------------------------- | -------------------- | ----------------- | ---------------------------- |
| GET    | `/api/v1/programs`                | `program:read`       | 200 (paginado)    | 401/403/503                  |
| POST   | `/api/v1/programs`                | `program:write`      | 201 (+`Location`) | 401/403/409 (sigla)/422      |
| GET    | `/api/v1/programs/:id`            | `program:read`       | 200               | 401/403/404                  |
| PUT    | `/api/v1/programs/:id`            | `program:write`      | 200               | 401/403/404/409/422          |
| POST   | `/api/v1/programs/:id/deactivate` | `program:deactivate` | 200               | 401/403/404/409 (já inativo) |
| POST   | `/api/v1/programs/:id/reactivate` | `program:deactivate` | 200               | 401/403/404/409 (já ativo)   |
| POST   | `/api/v1/programs/:id/logo`       | `program:write`      | 200               | 401/403/404/413/415/422      |

- **Backward-compat**: módulo novo, sem rota legada a versionar. Concorrência: `PUT` aceita `version` esperada → 409 `program-version-conflict` em stale-write; **desativar/reativar não usam `version`** (proteção por guarda de estado — análise F1).
- **Respostas de escrita**: `POST`/`PUT`/`deactivate`/`reactivate` retornam o **recurso no corpo** (201/200), nunca 200 vazio — evita o bug "200 sem corpo" que estourava o BFF (handoff de Parceiros, `handbook/tickets/todo/README.md`).

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **L** (BC novo, agregado + 3 VOs, outbox, 6 use cases, 6–7 endpoints, 2 tabelas, storage).
- **Justificativa**: cria módulo completo do zero; supera "VO/use case localizado" (M). Pode ser fatiado em sub-tickets por user story (P1 criar+listar → P2 detalhar+editar+desativar → P3 reativar/logo) na fase `/speckit-tasks`.
- **Plano de testes W0 (RED)** — suites que falham primeiro por inexistência da API:
  - `tests/modules/programs/domain/program/program.test.ts` — `Program.create` (sigla/nome obrigatórios), transições de status (desativar exige ATIVO; reativar exige INATIVO).
  - `tests/modules/programs/domain/program/sigla.test.ts` — normalização uppercase/sem-espaço, rejeição de caracteres inválidos.
  - `tests/modules/programs/application/use-cases/create-program.test.ts` — sigla duplicada → erro; `program_number` crescente.
  - `tests/modules/programs/adapters/http/programs-writes.routes.test.ts` — POST 201 + `Location`; 409 sigla; PUT 409 version-conflict; deactivate/reactivate.
  - `tests/modules/programs/adapters/http/programs-list.routes.test.ts` — paginação (5/10/25), busca case-insensitive por substring, lista vazia.
  - `tests/modules/programs/adapters/persistence/*.test.ts` — suite InMemory + Drizzle/MySQL (geração de `program_number` sob concorrência; UNIQUE sigla).
