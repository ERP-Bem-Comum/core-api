# FIN-RECON-EXECUTOR-NAME — nome do executor/closer na conciliação

**Issue:** [#207](https://github.com/ERP-Bem-Comum/core-api/issues/207) · **Size:** M · **Branch:** `feat/207-recon-executor-name`
**🎯 Goal:** o modal de conciliação exibir o **nome** de quem executou (`reconciledByName`) e de quem fechou o período (`closedByName`), sem exigir `user:read`.

## Decisão de arquitetura (ancorada)

**ADR-0032** (composição de leitura síncrona transitória na borda HTTP) — mesmo padrão já aplicado no `payeeBank` (`FIN-DETAIL-PAYEE-BANK`). O nome é resolvido **server-side dentro da rota** gated por `reconciliation:read`; a leitura cross-módulo é interna (não exige `user:read` por usuário, nem N+1 no front). Cross-módulo só por `public-api` (ADR-0006).

**Pré-requisito (achado de recon):** o `auth/public-api` **não expõe** leitura de nome de usuário hoje (só `AuthEtlPort`/email-events/http/migrate). É preciso **criar** o read port, espelhando o molde do partners:
- `src/modules/partners/public-api/read.ts` (`buildPartnersReadPort` + `ContractorReadPort`) + `contractor-read.drizzle.ts` (store) + `application/ports/contractor-read.ts` (tipo).

## Escopo técnico

### Parte A — novo read port no `auth` (molde partners-read)
- `src/modules/auth/application/ports/user-read.ts` (novo) — `AuthUserReadPort = { getUserName: (id: string) => Promise<Result<{ id: string; name: string | null } | null, AuthUserReadError>> }`. `null` = id inexistente; `name` pode ser `null` (auth_user.name é nullable). Erro de infra → `'auth-user-read-unavailable'`.
- `src/modules/auth/adapters/persistence/repos/user-read.drizzle.ts` (novo) — store Drizzle (SELECT id,name FROM auth_user WHERE id=?). Read-only.
- `src/modules/auth/public-api/read.ts` (novo) — `buildAuthUserReadPort({ connectionString })` (espelha `buildPartnersReadPort`; `applyMigrations:false`; expõe `close`). Re-export do tipo no barrel.
- (Opcional) variante batch `getUserNames(ids[])` se simplificar o período; não obrigatório.

### Parte B — composição síncrona no `financial` (borda, ADR-0032)
- `composition.ts` — `FinancialCompositionConfig.authUserReadPort?` (injetável em testes; mysql constrói via `buildAuthUserReadPort(writerUrl)`, fecha no shutdown). Dep `resolveUserName: (id) => Promise<string | null>` (degradação graciosa: port nulo/not-found/erro → `null`). Marcar `@transient` (ADR-0032).
- `dto.ts` — `transactionReconciliationToDto(r, reconciledByName = null)` += `reconciledByName: string | null` (#175). O DTO de período (#173) += `closedByName: string | null`.
- `schemas.ts` — `reconciledByName`/`closedByName` (`z.string().nullable()`) nos respectivos response schemas.
- `plugin.ts` — handlers do #175 (`GET /statement-transactions/:id/reconciliation`) e #173 (lista de períodos / detalhe) compõem o nome via `deps.resolveUserName(reconciledBy|closedBy)` antes de serializar.

## ✅ Critérios de aceite
- **CA1 — Dado** uma conciliação cujo `reconciledBy` resolve a um usuário com nome, **Quando** `GET /statement-transactions/:id/reconciliation`, **Então** o body inclui `reconciledByName` = nome (e `reconciledBy` UUID mantido).
- **CA2 — Dado** um `reconciledBy` não encontrado (ou nome nulo, ou port ausente), **Quando** `GET /:id/reconciliation`, **Então** `reconciledByName = null` (degradação graciosa, sem 5xx).
- **CA3 — Dado** um período fechado com `closedBy`, **Quando** lista/detalhe de períodos (#173), **Então** inclui `closedByName` (resolvido) ou `null`.
- **CA4 — Dado** um operador com `reconciliation:read` (sem `user:read`), **Quando** consulta o lookup, **Então** recebe o nome (200) — a resolução é server-side, não passa pelo `GET /users/:id`.
- **CA5** — `AuthUserReadPort.getUserName`: id existente → `{id,name}`; inexistente → `null`; (integração drizzle gated em `MYSQL_INTEGRATION`).

## Disciplina
ESM `.ts` + `import type`; `exactOptionalPropertyTypes`; `domain`/`application` do financial não conhecem auth (composição só na borda — ADR-0006/0032); auth port read-only; sem tocar ADR aceito. Gate W3 verde; sem regressão.
