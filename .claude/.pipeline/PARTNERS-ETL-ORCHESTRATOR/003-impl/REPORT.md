# W1 — GREEN · PARTNERS-ETL-ORCHESTRATOR

> Skill: `ports-and-adapters`. Objetivo: implementar o mínimo (`scripts/etl/orchestrate.ts` +
> `scripts/etl/main.ts`) até os 13 testes unitários do W0 ficarem verdes, sem tocar `src/`.
>
> Nota de processo: o subagent que executou a wave foi bloqueado pelo harness de escrever este
> arquivo (regra anti-`.md` para subagents). O conteúdo foi consolidado pelo orquestrador-main a
> partir do retorno do subagent **+ verificação independente** das provas de GREEN (regressão zero).

## Arquivos criados/alterados

Criados:

- `scripts/etl/orchestrate.ts` — função pura `orchestrate(deps)(data)`. Exporta `MIGRATION_ORDER`,
  `EntityName`, `QuarantineRecord`, `QuarantineSink`, `ReconciliationReport`, `OrchestrateError`,
  `OrchestrateDeps`. Costura read → map → write → reconcile com ports injetados (testável sem Docker).
- `scripts/etl/main.ts` — `runEtl({ dumpPath, connectionString, dryRun })`: wiring
  `buildAuthEtlPort` + `buildPartnersEtlPort` + `withLegacyMysql` + `readLegacyData` + `orchestrate`.
  Flags `--dry-run`/`--dump`; `installLastResortHandlers` + `SIGTERM`; sink `.jsonl` dupla (D12) em
  `.tmp/etl-quarantine/` (gitignored); guard de entrypoint.

Alterados:

- `package.json` — script `test:integration:etl:orchestrate` (espelha `test:integration:etl`).
- `tests/etl/orchestrate.fakes.ts` e `tests/etl/orchestrate.test.ts` — saneamento de defeitos
  latentes do W0 que só typecheck/lint expõem (ver abaixo).

## Decisões de implementação não-óbvias

1. **`UserId → UserRef`:** auth retorna `UserId` (brand `'UserId'`); `UserProfile`/store usam
   `UserRef` (kernel). Convertido via `UserRefVo.rehydrate(userId)` (ambos UUID v4); falha → quarentena.
2. **`email: string → Email` VO:** o mapper de user devolve `string`; o `AuthEtlPort` exige `Email`.
   `Email.parse` na borda; falha → quarentena `EmailInvalid`.
3. **Defeitos latentes do W0 corrigidos** (regressão zero — `pnpm test` puro não pegava, typecheck/lint sim):
   - `orchestrate.test.ts`: `import type { SupplierId }` + `import * as SupplierId` colidiam (TS2300)
     → namespaces renomeados para `*IdVo`.
   - `orchestrate.fakes.ts`: fixture `collaboratorRow().occupationArea` era `'TECNOLOGIA'`, fora da
     union `OccupationArea` (`PARC|DDI|DCE|EPV`) → mapper rejeitava. Trocado para `'PARC'` (valor válido).
   - fakes/sinks `async` sem `await` → forma síncrona + `Promise.resolve(...)` (evita `require-await`).
   - Nenhuma mudança em `src/` de produção; os 13 testes exercem o mesmo contrato.
4. **Lint estrito `scripts/`:** `migrateAggregateRow` tinha 6 params (`max-params:4`) → bundle
   `MigrateArgs`; `Acc` virou `interface` (`consistent-type-definitions`).
5. **`--dry-run`** ramifica antes de qualquer `provision`. **Idempotência** mapeia `already-exists`
   → `countAlreadyExists` (≠ `migrated`). **D10** conta `active === 0` migrados em `inactiveLegacyMarked`.

## Prova de GREEN (verificada de forma independente pelo orquestrador-main, não só relatada)

Todos exit 0:

- `pnpm test` → **`tests 1923 / pass 1907 / fail 0 / skipped 16`**. W0 RED era `1913 / 1895 / fail 2`.
  Os 2 fails sumiram; +10 unit do orquestrador, todos pass. `orchestrate.integration.test.ts` agora
  **SKIPA** (sem `PARTNERS_ETL_INTEGRATION=1`, Docker OFF) — não é mais `ERR_MODULE_NOT_FOUND`.
- `pnpm run typecheck` → `tsc --noEmit`, zero erros.
- `pnpm run lint` → `eslint .`, zero erros (lint estrito em `scripts/`).
- `pnpm run format:check` → "All matched files use Prettier code style!".

## Próximo passo

W2 (REVIEW read-only) via `code-reviewer` — max 3 rounds. Checkpoint humano após W1 (autorizado avançar a W1; novo checkpoint antes de W2).
