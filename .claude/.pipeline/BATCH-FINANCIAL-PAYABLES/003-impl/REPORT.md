# W1 — Implementação (GREEN) · BATCH-FINANCIAL-PAYABLES (#357)

**Outcome:** GREEN · 7/7 CAs verdes · typecheck limpo · format/lint OK.

## Roteamento por agente (código de produção via especialistas)

| Camada | Agente | Entregável |
| --- | --- | --- |
| Persistência + port | `drizzle-orm-expert` | port + adapter InMemory + adapter Drizzle |
| Borda HTTP + wiring | `fastify-server-expert` | schema Zod + rota + `composition.ts` + `dto.ts` + `error-mapping.ts` |
| Revisão de schema de borda | `zod-expert` (read-only) | REVIEW — **APPROVED** |

## Arquivos

**Novos (persistência — `drizzle-orm-expert`):**
- `application/ports/payable-summary-by-ids-view.ts` — port `PayableSummaryByIdsView` + `PayableSummaryRow` (11 campos do contrato). `getPayablesSummaryByIds(refs) → Promise<Result<readonly PayableSummaryRow[], 'payable-summary-by-ids-view-failure'>>`. refs vazio → `ok([])`; id inexistente → linha omitida.
- `adapters/persistence/repos/payable-summary-by-ids-view.in-memory.ts` — `createInMemoryPayableSummaryByIdsView(getRows)`, filtra por `refSet`.
- `adapters/persistence/repos/payable-summary-by-ids-view.drizzle.ts` — `createDrizzlePayableSummaryByIdsView(handle)`: `finPayables INNER JOIN finDocuments LEFT JOIN finSupplierView` (`name`/`document` por `supplierRef`) + `inArray(finPayables.id, refs)`; mapper `row → Result`.

**Modificados (borda + wiring — `fastify-server-expert`):**
- `adapters/http/schemas.ts` — `payablesBatchBodySchema` / `payableBatchItemSchema` / `payablesBatchResponseSchema` (subset de `payableSummarySchema` + `supplierName`/`supplierDocument`; `valueCents` reusa `centsStringSchema`).
- `adapters/http/plugin.ts` — rota `POST /financial/payables:action(^:batch$)` (custom method AIP-136; regex fixa o literal `:batch`). Handler deriva `items` (via `payableBatchItemToDto`) + `missing` (refs sem row via `Set`).
- `adapters/http/dto.ts` — `payableBatchItemToDto` (`valueCents = String(cents)`, `dueDate → YYYY-MM-DD`).
- `adapters/http/error-mapping.ts` — `payable-summary-by-ids-view-failure` no dicionário PT.
- `adapters/http/composition.ts` — 6 pontos de wiring; no driver memory as rows derivam do **`documentStore`** (não `payableStore`), espelhando `toItem` de `payable-list-view.in-memory.ts`, com `supplierName`/`supplierDocument` = `null`.

## Validação

```
node --test payables-batch.http.test.ts → 7/7 ✔ (CA1..CA7)
pnpm run typecheck                       → limpo
prettier --write (9 arquivos)            → unchanged
eslint (9 arquivos)                      → 0 problemas
```

## Revisão de schema (`zod-expert`) — APPROVED

Sem Blocker/Major. 3 Minors **pré-existentes/opcionais**, fora do escopo do #357:
1. `documentType`/`paymentMethod` como `z.string().nullable()` em vez de enum fechado — herdado de `payableSummarySchema`; o revisor recomenda **ticket transversal à parte** (evita scope-creep, ADR-0040), aplicando em summary + batch juntos.
2. Sem `.meta({description})` — convenção do módulo.
3. `refs` não deduplica — sem risco (handler usa `Set`/`filter`; repetição não gera item duplicado).

## Notas para W2/W3

- Cobertura memory: `supplierName`/`supplierDocument` = `null` (read-model vazio). Resolução real via `fin_supplier_view` (LEFT JOIN) fica para `test:integration` / Bruno E2E (fora do escopo do gate W3 puro).
- Bruno de smoke (item do #357) ainda pendente — candidato ao W1 do slice #358 ou follow-up.

## Próximo (W2)

Revisão read-only geral (skill `code-reviewer`): aderência a ports/adapters, isolamento de módulo, mapper `Result`, roteamento do custom method.
