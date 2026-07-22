# W1 — Implementação GREEN · BATCH-PARTNERS-SUPPLIERS (#356)

**Agente:** `fastify-server-expert` (plugin v2 + schema + adapter + wiring) · **Verificação:** main loop (gate rodado à parte)
**Outcome:** GREEN — suíte partners 659/659, os 2 testes do #356 9/9, typecheck/format/lint limpos.

## Decisão de design (Gabriel, no W1)
**Port DEDICADO `SuppliersBatchReadPort`**, não estender o `ContractorReadPort` compartilhado. Motivo: estender o port compartilhado espalhava stub por ~8 mocks em `contracts` + `financial` (frente do outro agente) → quebrava o isolamento das worktrees. A 1ª tentativa (port compartilhado) foi **revertida** (`ContractorReadPort` voltou ao original; stubs de contracts/financial intactos).

## Arquivos (SÓ partners + server.ts — zero contracts/financial)
**Criados:**
- `application/ports/suppliers-batch-read.ts` — `SuppliersBatchReadPort` + `SupplierBatchView { ref, name, taxId, serviceCategory }` + `SupplierBatchResult { items, missing }` + erro `suppliers-batch-read-unavailable`.
- `adapters/persistence/repos/suppliers-batch-reader.drizzle.ts` — `createDrizzleSuppliersBatchReader`: **1 query** `inArray(parSuppliers.id, refs)` selecionando só `id/name/cnpj/serviceCategory` (anti-N+1 + minimização em profundidade — nem lê bancário).
- `adapters/persistence/repos/suppliers-batch-reader.in-memory.ts` — `makeInMemorySuppliersBatchReader(seed)`.
- `adapters/http/supplier-batch-plugin.ts` — `suppliersBatchHttpPlugin`, `POST /partners/suppliers:batch`, `preHandler: [requireAuth, authorize('supplier:read')]`.

**Alterados:**
- `adapters/http/supplier-schemas.ts` — `suppliersBatchBodySchema` + `suppliersBatchResponseSchema`.
- `adapters/http/composition.ts` — `getSuppliersView` nas deps + `suppliersBatchReader` (memory/mysql).
- `public-api/http.ts` — export do plugin.
- `src/server.ts` — registro no bloco `/api/v2` (ao lado do financial v2).

## CAs
- CA1/CA2/CA4/CA5 → GREEN (rota inject). CA3/CA6 → GREEN (schema).
- **CA7** (anti-N+1, 1 query contra MySQL real) → **W3** (`test:integration:partners`). A query já usa `inArray` numa chamada; falta provar contra MySQL real.

## Verificação (main loop, não só a palavra do subagente)
- `git status`: só partners + server.ts; **zero contracts/financial**.
- `pnpm run typecheck` / `format:check` / `lint` → limpos.
- `tests/modules/partners/**` → **659 pass / 0 fail / 0 skip**.
- `suppliers-batch.{schema,routes}.test.ts` → 9 pass / 0 fail.
