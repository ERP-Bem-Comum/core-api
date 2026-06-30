# W0 (RED) — CONTRACTS-DETAIL-COMPOSITION-HTTP

**Wave**: W0 · **Agente**: tdd-strategist · **Size**: M
**Feature**: `specs/002-contracts-http-gaps/` (ticket #4) · **Data**: 2026-06-06

## Escopo

`GET /api/v2/contracts/:id` compõe o bloco `contractor { type, id, snapshot|null }` via
`ContractorReadPort` (public-api de Parceiros, agora 4/4 após ticket #3), com `Deprecation`/`Sunset`
(ADR-0032) e degradação graciosa (FR-006: not-found/IO/timeout → `snapshot: null` idêntico).

## Testes RED

- `tests/modules/contracts/adapters/http/contractor-composition.test.ts` (unit) — `composeContractor(port, ref, opts?)`: supplier→snapshot c/ bankAccount/pixKey; collaborator→sem bancário; ok(null)/err/timeout → `snapshot: null` (anti-oráculo).
- `tests/modules/contracts/adapters/http/contract-detail-composition.http.test.ts` (rota, memory + port fake injetado) — detalhe inclui `contractor` block + snapshot (supplier) + headers `Deprecation`/`Sunset`; contratado ausente → `snapshot: null` (200).

## Prova do RED

```
node --test ...contractor-composition.test.ts ...contract-detail-composition.http.test.ts
ℹ tests 3 · pass 0 · fail 3
ERR_MODULE_NOT_FOUND: .../adapters/http/contractor-composition.ts
```

RED por inexistência: `contractor-composition.ts` não existe; `buildContractsHttpDeps` não aceita
`contractorReadPort` e a rota não compõe o bloco.

## Roteiro W1

1. `adapters/http/contractor-composition.ts` — `composeContractor(port, ref, {timeoutMs}) → { type, id, snapshot|null }` (switch por type → getter; timeout via Promise.race; colapsa falhas em null; mapeia View→snapshot, supplier inclui bankAccount/pixKey).
2. `composition.ts` — `ContractsCompositionConfig.contractorReadPort?`; dep `getContractorSnapshot`/bloco; mysql → `buildPartnersReadPort(writerUrl)` (+ close no shutdown); memory → port injetado ou null (degrada).
3. `contract-dto.ts` — `contractToDetailDto(detail, contractorBlock)` + metadados (observations/email/telephone).
4. `schemas.ts` — `contractFullDetailSchema` ganha `contractor` block + metadados.
5. `plugin.ts` — handler GET compõe + seta `Deprecation`/`Sunset`.
