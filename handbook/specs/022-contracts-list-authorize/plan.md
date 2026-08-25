# Implementation Plan: Autorização na listagem de contratos (`contract:read`)

**Branch**: `022-contracts-list-authorize` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/022-contracts-list-authorize/spec.md`

## Summary

`GET /api/v2/contracts` (listagem) aplica apenas `requireAuth` (`src/modules/contracts/adapters/http/plugin.ts:178-180`) — qualquer autenticado lista contratos sem `contract:read`. As demais leituras do módulo já exigem `contract:read`: `/contracts/:id` (`:250`), `/contracts/:id/history` (`:351`), `/contracts/export.csv` (`:224`). A permissão **já está no catálogo central** (diferente do #200 — aqui não há gap de catálogo, só o guard ausente na rota; o comentário `:246` "GET /contracts permanece enxuto" é a origem do esquecimento).

**Abordagem (mínima)**: adicionar `hooks.authorize(CONTRACT_PERMISSION.read)` ao `preHandler` da rota de listagem, alinhando-a às irmãs. Blindado por teste de integração com `authorize` **real** (`buildAuthHttpDeps` + seed RBAC, padrão de `contracts-export-csv.routes.test.ts`) cobrindo o caso negado (403 sem a permissão) — o gap atual passou porque a cobertura da listagem só exercita o caminho com permissão.

## Technical Context

**Language/Version**: TypeScript 6 (strict) · Node.js 24 LTS · ESM `NodeNext`.

**Primary Dependencies**: módulo `contracts` (borda HTTP — `adapters/http/plugin.ts`); `authorize` do módulo `auth` injetado via `auth/public-api` (já cabeado em `server.ts`); Fastify; `node:test`.

**Storage**: N/A — sem alteração de `schema.ts`, sem migration.

**Testing**: `node:test`. Teste de rota da listagem com `authorize` real (`buildAuthHttpDeps` driver `memory` + seed RBAC + `fastify.inject`), em `tests/modules/contracts/adapters/http/`.

**Target Platform**: backend modular-monolith, borda HTTP `/api/v2`.

**Project Type**: modular monolith backend (ADR-0006).

**Performance Goals**: N/A (um preHandler a mais numa rota existente).

**Constraints**: ADR-0006 (cross-módulo só via public-api — já respeitado: `authorize` vem da public-api do auth, injetado no plugin). ADR-0014 (1 BC só: contracts).

**Scale/Scope**: 1 linha de produção (preHandler) + casos de teste RBAC. Tamanho **S**.

## Constitution Check

| Princípio                         | Status | Nota                                                                                                                         |
| --------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| I. TDD W0→W3 fail-first           | ✅     | W0 RED (403 sem `contract:read`, hoje 200) antes de tocar `src/`.                                                            |
| II. Regressão zero                | ✅     | Gate W3 completo verde para fechar.                                                                                          |
| III. pnpm único                   | ✅     | Sem mudança de deps.                                                                                                         |
| IV. Modular monolith + isolamento | ✅     | Único BC (contracts). `authorize` já vem da public-api do auth (sem novo acoplamento; ADR-0006).                             |
| V. Domínio puro                   | ✅     | Mudança é na borda (adapter HTTP), não no domínio.                                                                           |
| VI. MySQL/Drizzle migrations      | ✅ N/A | Sem schema.                                                                                                                  |
| VII. HTTP-first; CLI aposentada   | ✅     | Validação por teste HTTP real (`fastify.inject`); sem CLI (ADR-0037).                                                        |
| VIII. TS strict + ESM + idioma    | ✅     | Código EN; `import type`; `.ts`.                                                                                             |
| IX. Decisões ancoradas no cânone  | ✅     | Decisão (exigir a permissão na listagem) ancorada em least-privilege / secure-by-default — ver [research.md](./research.md). |

**Resultado**: PASS. `Complexity Tracking` vazio.

## Project Structure

### Documentation (this feature)

```text
specs/022-contracts-list-authorize/
├── plan.md · spec.md · research.md · data-model.md · quickstart.md
├── contracts/contracts-list-authorization.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/modules/contracts/adapters/http/plugin.ts   # (W1) + authorize(CONTRACT_PERMISSION.read) no preHandler de GET /contracts (L180)

tests/modules/contracts/adapters/http/
└── contracts-list-authorize.routes.test.ts      # (W0, NOVO) authorize REAL: 401 / 403 sem perm / 200 com perm
```

**Structure Decision**: monolito existente. Única mudança de produção = 1 preHandler em `plugin.ts`. Teste novo focado no RBAC da listagem (não polui o teste de filtros existente).

## Complexity Tracking

> Sem violações. Nada a justificar.

## Migrations Drizzle (core-api)

- **Mudanças de schema**: [x] **nenhuma** · Outbox: não · `db:generate`: N/A.

## Contrato HTTP (Fase 2+)

Rota **já existente** — nenhuma rota nova, nenhum schema request/response alterado. Muda só o `preHandler`:

| Método | Rota                | preHandler (antes → depois)                                 |
| ------ | ------------------- | ----------------------------------------------------------- |
| GET    | `/api/v2/contracts` | `requireAuth` → `[requireAuth, authorize('contract:read')]` |

Backward-compat: quem tem `contract:read` não percebe diferença; quem não tem passa de 200 (vazamento) para 403. Ver [contracts/contracts-list-authorization.md](./contracts/contracts-list-authorization.md).

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **S** (1 preHandler + casos de teste RBAC; sem schema/migration/rota).
- **Justificativa**: correção de 1 linha; o esforço é a cobertura negada com `authorize` real. Ticket único `CTR-LIST-AUTHORIZE`.
- **Plano de testes W0 (RED)**: novo `contracts-list-authorize.routes.test.ts` — usuário autenticado **sem** `contract:read` → **403** em `GET /contracts` (hoje **200** = RED); sem token → 401; com `contract:read` → 200. Seed via `buildAuthHttpDeps` (padrão `contracts-export-csv.routes.test.ts`), exercitando o `authorize` real.
