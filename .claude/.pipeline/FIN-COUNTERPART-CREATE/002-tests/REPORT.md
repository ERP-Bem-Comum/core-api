# W0 — RED · FIN-COUNTERPART-CREATE (US1 · spec 029 · #269)

> **Outcome:** RED · Skill: `tdd-strategist` · Módulo `financial` (worktree `269-counterpart`)

## Testes (novos)

- `tests/modules/financial/domain/expected-counterpart/create.test.ts` (T011) — 4 casos
- `tests/modules/financial/application/use-cases/record-manual-entry-counterpart.test.ts` (T012) — 3 casos

## API fixada pelos testes (a implementar no W1)

| Símbolo | Assinatura esperada |
| :-- | :-- |
| `ExpectedCounterpartId.generate/rehydrate` | branded uuid → `Result` |
| `ExpectedCounterpart.create` | `({ id, destinationAccountRef, originAccountRef, originReconciliationRef, originTransactionRef, originMovement, valueCents: bigint, expectedDate }) → Result<{ counterpart, events }, ExpectedCounterpartError>` |
| `recordManualEntry` (estendido) | novo dep `expectedCounterpartStore`; quando `type='Transfer'` + `destinationAccountRef` → cria contrapartida na mesma unit-of-work |
| `ExpectedCounterpartStore` (port + in-memory) | `save`, `findById`, `listPendingByAccount`, `findByOriginReconciliation` |

Invariantes fixadas: `movement` = OPOSTO ao da origem (Debit→Credit); `valueCents` = valor da transação; `status='Pending'`; evento `TransferCounterpartCreated`; erros `counterpart-value-invalid`/`counterpart-same-account`.

## Cobertura por CA

| CA | Camada | Caso |
| :-- | :-- | :-- |
| CA1 | application | Transfer+destino → 1 contrapartida Pending em B (movement oposto, valor da transação) |
| CA2 | application | sem destino **ou** type≠Transfer → nenhuma contrapartida (guard de não-regressão) |
| CA3 | domínio | valor>0, destino≠origem, Pending, movement oposto (ambas direções), evento Created |
| — | domínio | valor≤0 → `counterpart-value-invalid`; destino==origem → `counterpart-same-account` |

## Prova de RED (inexistência da API)

- T011: `ERR_MODULE_NOT_FOUND` de `domain/expected-counterpart/expected-counterpart-id.ts`.
- T012: `ERR_MODULE_NOT_FOUND` de `adapters/persistence/repos/expected-counterpart-store.in-memory.ts`.

## Handoff W1 (Foundational + US1)

`ts-domain-modeler` + `drizzle-schema-author` + `drizzle-orm-expert`:
- **Foundational (T003-T010):** id branded, `types.ts`, `events.ts`, port `expected-counterpart-store.ts`, adapter in-memory, adapter Drizzle, schema `fin_expected_counterpart` + `db:generate`, contrato de eventos no handbook.
- **US1 (T013-T015):** `create` no agregado; integrar no `record-manual-entry` (Transfer+destino → cria na unit-of-work + outbox); wiring na composição.
- **W3:** validar a migration no x99 (túnel + MySQL 8.4).
