# W1 — FIN-RECON-EXECUTOR-NAME (#207)

**Resultado:** GREEN ✅ — `ports-and-adapters` (via `contratos-orchestrator`); verificado pelo orquestrador-pai.

## Parte A — novo read port no auth (molde partners-read)
- `src/modules/auth/application/ports/user-read.ts` — `AuthUserReadPort = { getUserName }`, `AuthUserNameView = { id; name: string | null }`, erro `'auth-user-read-unavailable'`.
- `src/modules/auth/adapters/persistence/repos/user-read.drizzle.ts` — `createDrizzleUserReadStore` (SELECT id,name FROM auth_user; try/catch→Result; read-only).
- `src/modules/auth/public-api/read.ts` — `buildAuthUserReadPort({ connectionString })` (`applyMigrations:false`, `close`); re-export do tipo (auth/public-api é per-file, sem index — segue `etl.ts`).

## Parte B — composição síncrona no financial (ADR-0032)
- `user-name-composition.ts` (novo) — `resolveUserName(port, id)`; degradação graciosa (port/id nulo, not-found, nome nulo, erro → `null`); `@transient`.
- `composition.ts` — `FinancialCompositionConfig.authUserReadPort?` + `Pools.authUserReadPort` + dep `resolveUserName`; mysql constrói via `buildAuthUserReadPort(writerUrl)` e fecha no shutdown.
- `dto.ts` — `transactionReconciliationToDto(r, reconciledByName=null)` (#175) + `reconciliationPeriodsToDto(periods, names)` (#173) `closedByName`.
- `schemas.ts` — `reconciledByName`/`closedByName` `z.string().nullable()`.
- `plugin.ts` — #175 compõe `resolveUserName(reconciledBy)`; #173 deduplica closers (Set) + `Promise.all` → Map.

## Desvios (do 000-request)
- Sem `index.ts` barrel em auth/public-api (não existe) — tipo re-exportado de `read.ts`. Espírito idêntico ao molde partners.
- `getUserNames` batch (opcional) não criado — #173 resolve via dedupe+Promise.all (YAGNI).
