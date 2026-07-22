# W1 — GREEN (núcleo) · FIN-PAYABLE-READMODEL (#235)

Disciplina: **`ts-domain-modeler`** (domínio + eventos) + **`ports-and-adapters`** (projetor/store) + **`drizzle-schema-author`** (tabela). Núcleo do read-model implementado até GREEN.

## Mudanças (núcleo — CA1-CA4)

| Arquivo | Mudança |
| :-- | :-- |
| `domain/document/events.ts` | `DocumentSaved` enriquecido (`supplierRef/contractRef/categoryRef/costCenterRef/programRef` + `payables: PayableSnapshot[]`); `ApprovalUndone` + `payableIds`. Aditivo. |
| `domain/document/document.ts` | `documentSavedEvents(document, payables)` monta o snapshot (valores JSON-safe: cents string, dueDate ISO); usado por create/adjust/editMetadata; `undoApproval` enriquece `ApprovalUndone`. |
| `domain/payable-view/types.ts` | `PayableView` + `PayableViewStatus`. |
| `application/ports/payable-view-store.ts` | port `PayableViewStore` (`upsert`/`updateStatus`/`list`). |
| `application/use-cases/apply-payable-event.ts` | projetor idempotente (molde `applySupplierEvent`): DocumentSaved→upsert; status events→updateStatus; fora do contrato→skip. |
| `adapters/persistence/repos/payable-view-store.{in-memory,drizzle}.ts` | adapters; `status` é dono das transições (upsert não regride). |
| `adapters/persistence/schemas/mysql.ts` + migration `0027_nice_thundra.sql` | tabela `fin_payable_view` (varchar ids, bigint cents, date, varchar status/kind, 6 índices). CREATE TABLE (sem ALTER). |

## Verificação

- W0 do ticket: **CA1 (evento enriquecido) + CA2/CA3/CA4 (projetor) GREEN** (5 testes).
- Cluster de regressão (document/save/timeline/adjust/undo): verde — enriquecimento aditivo, nenhum consumidor quebrou.
- `typecheck` + `format:check` + `lint` verdes; `pnpm test` **3301 pass / 0 fail / 18 skipped**.

## Carve-out — fatia seguinte (worker CA5 + integração)

**Descoberta:** o `financial` **nunca teve consumidor do próprio outbox** — `fin-outbox-helpers.ts` é **produtor-apenas**; não há `outbox-repository.drizzle` do financial (o supplier-view worker lê o `par_outbox` do partners, não o do financial). Logo o worker `payable-view-projection` (CA5) exige **construir antes um outbox-reader do financial** (mirror de `contracts/.../outbox-repository.drizzle.ts` + claim/markProcessed/DLQ). Isso + a integração no MySQL real (W3) formam a fatia **FIN-PAYABLE-PROJECTION-WORKER** (follow-up).

O **núcleo entregável** (a fundação que a Camada 1-2 consulta: `applyPayableEvent` + `PayableViewStore` + tabela) está completo e verde. Wiring do public-api + worker vão com o follow-up.
