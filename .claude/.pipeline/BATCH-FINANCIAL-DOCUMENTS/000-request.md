# BATCH-FINANCIAL-DOCUMENTS — POST /api/v2/financial/documents:batch (#358)

**Issue:** #358 · Slice **3/3** do #350 (endpoints batch-by-id) · Fundação da inversão core↔BFF (ADR-0049).
**Módulo:** `financial` (ADR-0014 — 1 módulo/sessão). **Size:** M.
**Precedente direto:** #357 (BATCH-FINANCIAL-PAYABLES) — este ticket espelha o slice de payables para documentos.

## Escopo

`POST /api/v2/financial/documents:batch` — resolve `documentId[]` → resumo do documento, para o BFF
compor as refs auxiliares do drawer de Detalhe (#95) sem N+1. Read-only. `financial` já é `/api/v2`.

## Contrato

- **Body:** `{ refs: z.array(z.uuid()).min(1).max(200) }`
- **200:** `{ items: [{ ref, documentNumber, type, status, supplierRef, supplierName, supplierDocument, netValueCents /* cents-string */, dueDate }], missing: uuid[] }`
  - `ref` = `documentId` (o BFF casa por `ref`, não por posição).
- **preHandler:** `[requireAuth, authorize('fiscal-document:read')]`
- **Erro:** envelope padrão (`shared/http/errors.ts`); uuid inválido → 400 `validation`; uuid válido sem registro → entra em `missing[]` (degradação graciosa, o lote não aborta).

## Decisões de design

1. **Port focado (ISP, como #357):** novo `DocumentSummaryByIdsView.getDocumentsSummaryByIds(refs)` —
   NÃO reusa `DocumentRepository.findPaged` (paginado, com filtros e Money VO). Subset projetado do que o batch precisa.
2. **`status` = displayStatus DERIVADO:** para não divergir do grid (#47) nem do drawer (#95), o adapter
   Drizzle replica a derivação de conciliação do `findPaged` (subquery `recon` + `case when isReconciled then 'Reconciled' else fin_documents.status end`, ADR-0022). Evita bug sutil de status inconsistente entre listagem e batch.
3. **`supplierName`/`supplierDocument`** vêm do read-model local `fin_supplier_view` via LEFT JOIN
   (null por degradação graciosa quando o outbox ainda não resolveu — ADR-0043). Driver `memory`: sempre null.
4. **`netValueCents`/`dueDate` nullable** (Draft pode não tê-los) — subset fiel de `documentSummarySchema` (schemas.ts:270-296).
5. **Roteamento custom method (AIP-136):** `url: '/financial/documents:action(^:batch$)'` — fixa o literal
   `:batch` e devolve 404 p/ paths irmãos (`/documentsXYZ`), idêntico ao #357.

## Critérios de aceite (CA)

- **CA1** sem `Authorization` → 401.
- **CA2** token sem `fiscal-document:read` → 403.
- **CA3** `refs` com UUID mal-formado → 400.
- **CA4** `refs` vazio → 400 (min 1).
- **CA5** `refs` > 200 → 400 (max 200).
- **CA6** `refs=[existente, inexistente]` → 200 com `items` (1) + `missing` (`[inexistente]`); campos do item corretos.
- **CA7** `POST /documentsXYZ` (fora do custom method) → 404.
- **CA-INT** (integração, `MYSQL_INTEGRATION=1`): LEFT JOIN real com `fin_supplier_view` — supplierName/supplierDocument preenchidos quando o read-model tem a linha; null quando não tem.

## Fora de escopo

- Slice 1 (#356 suppliers:batch) e slice 2 (#357 payables:batch) — já entregues.
- Consumo pelo BFF (#95 drawer) — este ticket só entrega a rota core.

## Destrava

#95 (drawer de Detalhe — refs auxiliares em 1 hop).
