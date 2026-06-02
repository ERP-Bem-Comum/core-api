# W1 — GREEN — PARTNERS-ETL-STORE-INTEGRITY-ERROR

**Skill:** ports-and-adapters · **Wave:** W1 · **Data:** 2026-06-02

> Materializado pelo orquestrador-main (harness bloqueou escrita de `.md` pelo subagent).
> Provas re-verificadas independentemente pelo main (regressão zero).

## Arquivos alterados

- `src/modules/partners/application/ports/legacy-entity-store.ts:14` — `'partners-etl-store-integrity-violation'`
  adicionado à union `PartnersEtlStoreError` (CA1). `public-api/etl.ts` já re-exporta o tipo.
- `src/modules/partners/adapters/persistence/repos/partners-etl-store.drizzle.ts` — `ProvisionErrorClass`
  + `classifyProvisionError` exportados; `runProvision` migrado para switch exaustivo; `log()` preserva
  `.cause`; removidos `isLegacyDupEntry` e o catch genérico.
- `tests/modules/partners/adapters/persistence/repos/partners-etl-store-classify.test.ts` — saneamento
  de lint do W0 (`no-unnecessary-type-conversion`) + reformat.

## Implementação-chave

`classifyProvisionError(cause, legacyIdIndex): ProvisionErrorClass`:
- Extrai o índice de `... for key 'NOME'` do `sqlMessage`, reconhecendo o `.cause` do `DrizzleQueryError`.
- `errno 1062` + índice === `legacyIdIndex` → `'already-exists'` (idempotência preservada).
- `errno 1062` + índice `par_*_idx` (dado) → `'integrity-violation'`.
- `PRIMARY` / não-reconhecível / outro erro → `'unavailable'` (conservador).

> Decisão: a regra NÃO é "qualquer índice ≠ legacy → integrity". O teste exige `'PRIMARY' → unavailable`
> — só índices de dado `par_*_idx` viram integrity-violation.

Integração no catch (converte para Result na borda; caminho feliz + idempotência intactos):
`already-exists → ok`; `integrity-violation → err('partners-etl-store-integrity-violation')`;
`unavailable → err('partners-etl-store-unavailable')`. **PII** (valor duplicado no `sqlMessage`) só no
stderr efêmero via `log()`/`describeCause`; NUNCA no `Result`/reason (CA8).

## Prova dos 4 gates (verificada pelo orquestrador-main)

- `pnpm test` → **1939 tests / 1923 pass / 0 fail / 16 skipped** (11 unit do classify passam; contrato
  runtime passa; integração partners skipa sem Docker — sem `ERR_MODULE_NOT_FOUND`).
- `pnpm run typecheck` → zero erros (o `TS1360` do contrato sumiu).
- `pnpm run lint` → zero problemas.
- `pnpm run format:check` → "All matched files use Prettier code style!".

## Pendente

- **CA6** (integração gated 2-entidades-mesmo-cnpj → `integrity-violation`): provar com Docker ON via
  `pnpm run test:integration:partners` (`MYSQL_INTEGRATION=1`). Etapa posterior (igual ao 3b-ii).

## Próximo passo

W2 (REVIEW read-only) — `code-reviewer`. Checkpoint humano antes.
