# W1 (GREEN) — CONTRACTS-DETAIL-COMPOSITION-HTTP

**Wave**: W1 · **Agente**: ports-and-adapters · **Size**: M
**Feature**: `specs/002-contracts-http-gaps/` (ticket #4) · **Data**: 2026-06-06

## Resultado

Gates: `typecheck` ✓ · `format:check` ✓ · `lint` ✓ · `test` (default 2241/0) ✓ · `test:integration` (88/0, sem regressão no wiring mysql) ✓. Os 7 testes do ticket (5 unit composição + 2 http route) passam.

## Mudanças (produção — só `contracts/adapters/http`)

- **NOVO** `contractor-composition.ts` — `composeContractor(port|null, ref, {timeoutMs}) → { type, id, snapshot|null }`. Switch por `type` → getter do `ContractorReadPort`; `withTimeout` (default 2s) via `Promise.race`; colapsa not-found/IO/timeout em `snapshot: null` (anti-oráculo, FR-006); `viewToSnapshot` inclui bankAccount/pixKey só p/ supplier. Ref aceita `{type, id: string}` (ContractorId é assignable a string).
- `composition.ts` — `ContractsCompositionConfig.contractorReadPort?` (injetável em testes); `ContractsHttpDeps.getContractorBlock`; `Pools.contractorReadPort`; memory → port injetado ou `null` (degrada); mysql → `buildPartnersReadPort(writerUrl)` (lê `par_*`, ADR-0014) + close no shutdown.
- `contract-dto.ts` — `contractToDetailDto(detail, contractor)` adiciona o bloco `contractor` + metadados (observations/email/telephone).
- `schemas.ts` — `contractFullDetailSchema` ganha `contractor` block + metadados (4 variantes); list-item intocado.
- `plugin.ts` — GET `/contracts/:id` compõe o bloco e seta `Deprecation: true` + `Sunset` (RFC 8594, ADR-0032).

## Testes

- `contractor-composition.test.ts` (unit) — 5 casos (supplier c/ bancário, não-supplier, ok(null)/err/timeout → null).
- `contract-detail-composition.http.test.ts` (route memory + port fake) — snapshot composto + headers Sunset; contratado ausente → snapshot null (200).
- `contract-detail-dto.test.ts` — atualizado p/ o 2º arg (contractor block).

## Aderência

- ADR-0032: composição transitória na borda, núcleo intocado; `Deprecation`/`Sunset` declarados.
- ADR-0006/0014: cross-BC só via `partners/public-api` (`ContractorReadPort`); nenhum import de `partners/domain|application` em contracts.
- FR-006: degradação graciosa idêntica (anti-oráculo) + timeout.

## Nota

A rota gorda é exercitada em memory (gate default) com port fake injetado — a integração real fim-a-fim (contracts lendo par_* via buildPartnersReadPort no mesmo MySQL) é coberta pelo wiring mysql; um teste de integração cross-módulo dedicado pode ser adicionado num ticket futuro de e2e (Bruno).
