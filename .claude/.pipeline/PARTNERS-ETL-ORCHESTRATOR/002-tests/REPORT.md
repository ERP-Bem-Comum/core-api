# W0 — RED · PARTNERS-ETL-ORCHESTRATOR

> Skill: `tdd-strategist`. Objetivo: definir a estrategia de teste do orquestrador 3b-ii e
> escrever os testes RED que falham por **inexistencia da API** (`scripts/etl/orchestrate.ts` /
> `scripts/etl/main.ts`), descrevendo o contrato esperado da costura read->map->write->reconcile.

## Estrategia de teste

Decisao central: o orquestrador e majoritariamente I/O em 2 DBs, mas a **logica de costura e
pura** e fica testavel com **ports fake in-memory** — sem Docker, sem MySQL. Para isso, o
`orchestrate.ts` (W1) sera uma funcao **injetavel**:

```ts
orchestrate(deps: { authPort; partnersPort; quarantineSink; dryRun })(data: LegacyData)
  => Promise<Result<ReconciliationReport, OrchestrateError>>
```

Os ports recebidos sao EXATAMENTE os ja entregues e closed-green:
- `AuthEtlPort` (`#src/modules/auth/public-api/etl.ts`) — `provisionLegacyUser` + `close`.
- `PartnersEtlPort` (`#src/modules/partners/public-api/etl.ts`) — `suppliers/financiers/collaborators/userProfiles`
  como `LegacyEntityStore<A, Ref>` (`provision` idempotente + `findByLegacyId`) + `close`.

O `LegacyData` (ja lido pelo READER) e injetado, entao read->map->write e exercido de ponta a ponta
com agregados **reais** (construidos pelos mappers do CORE a partir de fixtures sinteticos). Os fakes:
- contam chamadas de `provision` -> provam que `--dry-run` nao persiste;
- simulam idempotencia por `legacy_id` (skip -> `already-exists`) -> provam re-run 2x;
- derivam refs deterministicas por `legacyId` -> permitem montar/validar o map `legacyCollaboratorId -> CollaboratorId`.

O wiring real (driver, `withLegacyMysql`, SIGTERM, parse de flags) vive em `main.ts` (W1) e e
exercido **so** pela integracao gated.

### Divisao unitario vs gated

| Camada | Arquivo | Gate | Conteudo |
| :--- | :--- | :--- | :--- |
| Unitario (logica pura) | `tests/etl/orchestrate.test.ts` | `pnpm test` (sempre roda) | 13 testes: ordem, happy path, vinculo user->collaborator (resolvido/null/orfao), idempotencia, quarentena das 3 fontes + PII-free, dry-run, inativos D10 |
| Integracao 2-DB | `tests/etl/orchestrate.integration.test.ts` | `PARTNERS_ETL_INTEGRATION=1` + skip-guard de daemon Docker | 2 testes: migracao completa do dump sintetico + reconciliacao balanceada; idempotencia 2x |
| Fakes/fixtures (helper, nao-descoberto) | `tests/etl/orchestrate.fakes.ts` | — | fakes in-memory dos ports + builders de linhas legadas sinteticas |

## Arquivos criados

- `tests/etl/orchestrate.fakes.ts` — fakes in-memory de `AuthEtlPort` e `LegacyEntityStore` (idempotencia + contagem de chamadas) + builders `supplierRow/financierRow/collaboratorRow/userRow` (dados sinteticos, CPF/CNPJ validos fake). **Nao** e `.test.ts` -> nao e descoberto pelo runner.
- `tests/etl/orchestrate.test.ts` — suite unitaria (13 `it`), consome `#scripts/etl/orchestrate.ts` (inexistente).
- `tests/etl/orchestrate.integration.test.ts` — suite gated (2 `it`), consome `#scripts/etl/main.ts` (`runEtl`, inexistente). Espelha `reader.integration.test.ts` (opt-in + skip-guard de daemon).

## Mapa criterio de aceite -> teste (W0)

| Criterio de aceite (000-request) | Teste |
| :--- | :--- |
| Ordem suppliers->financiers->collaborators->users | `ordem de migracao › MIGRATION_ORDER ...` |
| Map legacyCollaboratorId->CollaboratorId usado p/ collaboratorRef | `vinculo › user com collaboratorId resolvido ...` |
| collaboratorId=null -> collaboratorRef null | `vinculo › collaboratorId=null -> ...` |
| collaboratorId orfao -> quarentena, sem abortar | `vinculo › collaboratorId orfao -> quarentena ...` |
| Idempotencia already-exists nao conta como migrated | `idempotencia › rodar 2x ...` |
| Quarentena agrega 3 fontes (reader.failures + mapper + provision) | `quarentena › reader.failures ...` / `mapper error ...` / `provision error ...` |
| Resumo PII-free `{legacyId, table, reason}` | `quarentena › o resumo gravado e PII-free ...` |
| Reconciliacao balanceada por entidade (`isBalanced`) | asserts `isBalanced(...)` em multiplos testes |
| `--dry-run` nao chama provision | `dry-run › --dry-run nao chama provision ...` |
| Inativos D10 reportados | `inativos › migra inativos e reporta LEGACY_MIGRATION` |
| Integracao 2-DB gated + idempotencia 2x | `orchestrate.integration.test.ts` (gated) |

## Contrato esperado da API (a implementar em W1)

`scripts/etl/orchestrate.ts` deve exportar:
- `MIGRATION_ORDER: readonly EntityName[]` = `['suppliers','financiers','collaborators','users']`.
- `type EntityName = 'suppliers'|'financiers'|'collaborators'|'users'`.
- `type QuarantineRecord = Readonly<{ legacyId: number; table: EntityName; reason: QuarantineReason }>`.
- `type QuarantineSink = Readonly<{ record: (r: QuarantineRecord) => Promise<void> }>`.
- `type ReconciliationReport = Readonly<{ suppliers; financiers; collaborators; users: EntityTally; inactiveLegacyMarked: number }>`.
- `orchestrate(deps)(data) => Promise<Result<ReconciliationReport, OrchestrateError>>`.

`scripts/etl/main.ts` deve exportar `runEtl({ dumpPath, connectionString, dryRun }) => Promise<Result<ReconciliationReport, ...>>`
(cabeia `buildAuthEtlPort` + `buildPartnersEtlPort` + `withLegacyMysql` + `readLegacyData` + `orchestrate`).

**Costura nao-obvia (registrada p/ W1):** o auth retorna `UserId` (brand `'UserId'`), mas
`UserProfile.userRef` e o store `userProfiles` usam `UserRef` (brand `'UserRef'`, kernel). Sao brands
distintos — o orquestrador converte `UserId -> UserRef` via `UserRefVo.rehydrate(userId)` (ambos UUID v4).

## Prova do RED

Saida literal do `pnpm test` (suite global):

```
ℹ tests 1913
ℹ suites 614
ℹ pass 1895
ℹ fail 2
ℹ skipped 16
---failing files---
✖ tests/etl/orchestrate.integration.test.ts (84.923958ms)
✖ tests/etl/orchestrate.test.ts (79.159542ms)
```

Razao do RED (correta — API inexistente, nao erro de digitacao):

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../scripts/etl/orchestrate.ts'
  imported from .../tests/etl/orchestrate.test.ts
```

Isolamento (suite `tests/etl/**` apenas): **40 tests / 38 pass / 2 fail** — os 38 do CORE/READER
seguem verdes; so os 2 arquivos novos do orquestrador falham. Nenhuma regressao colateral.

## Nota de disciplina para W1 (skip-guard temporal)

A integracao gated (`orchestrate.integration.test.ts`) hoje falha **no `pnpm test` comum** porque
`#scripts/etl/main.ts` ainda nao existe — o `ERR_MODULE_NOT_FOUND` precede a avaliacao do `{ skip }`.
Isso e o RED **correto** agora. **Em W1**, ao criar `main.ts`, o import resolvera e a suite passara a
**skipar** sem o opt-in (exatamente como `reader.integration.test.ts` faz hoje, importando de modulos
que ja existem). W1 deve confirmar: `pnpm test` verde com `orchestrate.integration.test.ts` como
`skipped` (sem opt-in), e verde/efetivo via `pnpm run test:integration:etl:orchestrate` (com Docker).
Nao ha skip-guard defeituoso — e a natureza temporal do fail-first.

## Proximo passo

W1 (GREEN) — implementar `scripts/etl/orchestrate.ts` (logica pura) + `scripts/etl/main.ts` (wiring +
flags + SIGTERM) ate os 13 testes unitarios passarem; adicionar o script
`test:integration:etl:orchestrate` ao `package.json`. **Checkpoint humano antes de W1.**
