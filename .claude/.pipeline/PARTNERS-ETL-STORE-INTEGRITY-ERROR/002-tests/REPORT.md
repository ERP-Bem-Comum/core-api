# W0 — RED — PARTNERS-ETL-STORE-INTEGRITY-ERROR

**Skill:** tdd-strategist · **Wave:** W0 (fail-first) · **Data:** 2026-06-02

> Materializado pelo orquestrador-main (harness bloqueou escrita de `.md` pelo subagent).

## Objetivo

Testes RED que falham por inexistência da API nova (classificador puro + variante de erro) e por
o comportamento atual classificar `1062`-em-índice-secundário como `partners-etl-store-unavailable`
(infra) em vez de `partners-etl-store-integrity-violation` (dado). Corrige o "Achado 2" da auditoria
de 4 especialistas (HANDOFF §11 do PARTNERS-ETL-BOOTSTRAP).

## Arquivos criados

- `tests/modules/partners/adapters/persistence/repos/partners-etl-store-classify.test.ts` —
  unitário do classificador puro (sem MySQL), 11 `it()`. Gate: `pnpm test` (RED runtime: export inexistente).
- `tests/modules/partners/public-api/partners-etl-store-error-contract.test.ts` — contrato do tipo.
  Gate: `pnpm run typecheck` (RED: TS1360 — strip-types não checa tipos, então o canal é o tsc).
- `tests/modules/partners/public-api/partners-etl-store-integrity.integration.test.ts` — integração
  gated `MYSQL_INTEGRATION=1`, espelha `partners-etl-port.integration.test.ts`. Gate: `pnpm run test:integration:partners`.
- `package.json` — `test:integration:partners` agora inclui o novo `.integration.test.ts` (evita órfão/falso-verde — lição [[project-test-integration-auth-gap]]).

## Blast radius (confirmado por grep)

- **Declarado:** `src/modules/partners/application/ports/legacy-entity-store.ts:12` —
  `PartnersEtlStoreError = 'partners-etl-store-unavailable'`.
- **Re-exportado:** `src/modules/partners/public-api/etl.ts:27-31`.
- **Único produtor:** `src/modules/partners/adapters/persistence/repos/partners-etl-store.drizzle.ts` (linhas 67, 81).
- **Consumidores:** os 4 stores via `LegacyEntityStore` no `PartnersEtlPort`; o orquestrador ETL consome só pela public-api. **Aditivo** (adicionar variante à union); nenhum `switch` exaustivo sobre o tipo em `src/`. W1 não quebra consumidores.

## API-alvo (W1 cria)

- `ProvisionErrorClass = 'already-exists' | 'integrity-violation' | 'unavailable'`.
- `classifyProvisionError(cause: unknown, legacyIdIndex: string): ProvisionErrorClass` — pura,
  exportada de `partners-etl-store.drizzle.ts`; inspeciona `errno 1062` + nome do índice no `sqlMessage`,
  reconhecendo o `.cause` do `DrizzleQueryError`.
- `PartnersEtlStoreError += 'partners-etl-store-integrity-violation'` (port + re-export public-api).

## Prova do RED

- `pnpm test`: **1929 tests / 1 fail / 1912 pass / 16 skip**. Fail =
  `partners-etl-store-classify.test.ts` (`does not provide an export named 'classifyProvisionError'`).
- `pnpm run typecheck`: `TS2305 classifyProvisionError`; `TS2305 ProvisionErrorClass`;
  `TS1360 'partners-etl-store-integrity-violation' não satisfaz a union atual`.
- Integração: skipa com Docker OFF (RED de comportamento com Docker ON — store atual retorna `unavailable`).

## Notas W1

- NÃO alterar o caminho `already-exists` (idempotência por `legacy_id`). `classifyProvisionError`
  substitui `isLegacyDupEntry` + catch genérico.
- **PII:** o `sqlMessage` de `ER_DUP_ENTRY` carrega o VALOR duplicado (PII). O reason que cruza para
  o orchestrator/summary versionável é PII-free (só código + nome do índice, NUNCA o valor). PII só no
  stderr efêmero via `log()` com `.cause` preservado.
- ADR-0006 (contrato via public-api) · ADR-0020 (sem UPSERT; SELECT-then-INSERT permanece).

## Próximo passo

W1 (GREEN) — skill `ports-and-adapters`. Checkpoint humano antes de avançar.
