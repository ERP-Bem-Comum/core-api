# W0 — RED · FIN-PAYABLE-READMODEL (#235)

Skill: **`tdd-strategist`**. Runner: `node --test --experimental-strip-types`. RED por inexistência da API (Constituição I) + asserts de contrato.

## Arquivos

| Arquivo | CAs | Camada |
| :-- | :-- | :-- |
| `tests/.../use-cases/document-saved-enriched.test.ts` | CA1 | application (evento via outbox) |
| `tests/.../use-cases/apply-payable-event.test.ts` | CA2/CA3/CA4 (+skip) | application (projetor) |

## Resultado (RED esperado)

| CA | Estado | Motivo |
| :-- | :-- | :-- |
| CA1 (DocumentSaved enriquecido) | ✖ RED | `AssertionError` — evento hoje é magro (`{type,documentId,payableIds}`), sem `payables[]`/refs |
| CA2 (cria linha por título) | ✖ RED | `ERR_MODULE_NOT_FOUND` — `applyPayableEvent` + `payable-view-store.in-memory` não existem |
| CA3 (transições de status) | ✖ RED | idem (API inexistente) |
| CA4 (idempotência + recência) | ✖ RED | idem |

## Contrato definido pelo W0 (para o W1 implementar)

- **Evento enriquecido `DocumentSaved`**: `{ ..., supplierRef, contractRef, categoryRef, costCenterRef, programRef, payables: [{ payableId, kind, retentionType, valueCents(string), dueDate(ISO), status }] }`.
- **`applyPayableEvent(deps:{store})({eventType, payload})`** — molde de `applySupplierEvent`: filtra tipos publicáveis (`DocumentSaved`/`PayableApproved`/`PayableManuallyPaid`/`DocumentCancelled`/`ApprovalUndone`), parseia payload, aplica no store; evento fora do contrato → `ok` sem escrita.
- **`PayableViewStore` (in-memory)**: `upsert(rows)` (idempotente por `payableId`) + `updateStatus(payableIds, status, occurredAt)` (guard de recência: evento mais antigo não regride) + `list()`.
- **`PayableView`**: `{ payableId, documentId, kind, retentionType, supplierRef, contractRef, categoryRef, costCenterRef, programRef, valueCents(bigint), dueDate, status, occurredAt }`.

## Escopo do W1 (grande — L cross-cutting)

Enriquecer `DocumentSaved`/`ApprovalUndone` + produtores (`save-document`/cascade/adjust/submit-draft/cancel/undo-approval); novo `payable-view/` + store in-memory/drizzle + `fin_payable_view` (`db:generate`); `applyPayableEvent` + worker `payable-view-projection` (molde supplier) + wiring public-api. W3 inclui `test:integration` (Drizzle real). CA5 (delivery) + CA6 (backward-compat) verificados no W1/W3.
