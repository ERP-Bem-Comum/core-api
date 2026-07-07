# BATCH-FINANCIAL-PAYABLES — `POST /api/v2/financial/payables:batch`

> Issue: [#357](https://github.com/ERP-Bem-Comum/core-api/issues/357) · Épico [#350](https://github.com/ERP-Bem-Comum/core-api/issues/350) · Slice **2/3** dos endpoints batch-by-id.
> Fundação da inversão core↔BFF — ADR-0049. Módulo único: `financial` (ADR-0014). Base: `go-live`.

## Escopo

`POST /api/v2/financial/payables:batch` — resolve `payableId[]` → resumo do título, para o BFF
compor o **match card da Conciliação (#172)** sem N+1. Read-only, idempotente, sem efeito colateral.

**Destrava #172 em 1 hop:** `supplierName`/`supplierDocument` já vêm do read-model local
`fin_supplier_view` (ADR-0045), como o `documentSummarySchema` faz — o match card precisa de **uma**
chamada (`payables:batch`), não duas.

## Contrato (normativo — ADR-0049 §Forma canônica; épico #350)

```http
POST /api/v2/financial/payables:batch
Authorization: Bearer <jwt>
{ "refs": ["<uuid>", ...] }          # z.array(z.uuid()).min(1).max(200)

200 OK
{ "items": [ { "ref", "documentId", "documentNumber", "documentType",
               "valueCents" /* cents-string */, "dueDate", "status",
               "paymentMethod", "supplierRef",
               "supplierName" /* string|null */, "supplierDocument" /* string|null */ } ],
  "missing": [ "<uuid-válido-sem-registro>" ] }
```

- **preHandler:** `[requireAuth, authorize('fiscal-document:read')]`.
- **UUID mal-formado / body fora do shape → 400** (Zod barra na borda).
- **UUID válido sem registro → entra em `missing[]`**, não derruba o lote.
- **`items` sem ordem garantida** (o BFF casa por `ref`).
- Campos derivam do `payableSummarySchema` (`schemas.ts:874-897`) + `supplierName`/`supplierDocument`.

## Decisão de roteamento (custom method AIP-136 `:batch`)

O épico #350 assumiu que `:batch` seria "caminho estático irmão de `/:id`". **Não é:** o roteador do
Fastify (find-my-way v9) trata `:` como início de parâmetro, então `/payables:batch` registrado cru
captura **qualquer** `/payables*` (ex.: `POST /payablesXYZ` → 200). Desriscado empiricamente nesta sessão.

**Solução adotada:** registrar a rota com **param restrito por regex** que fixa o literal:

```ts
url: '/financial/payables:action(^:batch$)'
```

- `POST /financial/payables:batch` → casa (200); preserva **exatamente** a URL do contrato.
- `POST /financial/payablesXYZ` / `payables:qualquer` → **404** no nível do roteador (regex não casa),
  sem guard manual no handler.
- `req.params.action` (valor `:batch`) é ignorado.

A rota `:batch` é declarada **antes** de eventuais `/:id` irmãs (padrão do épico).

## Trabalho

- [ ] Port `getPayablesSummaryByIds(refs)` — novo (hoje só `PayableListView.findPaged`, paginado).
      Fonte de leitura: `fin_payables` × `fin_documents` × `fin_supplier_view`.
- [ ] Adapter Drizzle: `WHERE id IN (...)` + join local `fin_supplier_view` p/ `supplierName`/`supplierDocument`.
- [ ] Adapter InMemory (deriva de documentStore/payableStore, como `PayableListView`).
- [ ] Schema Zod (`schemas.ts`): `payablesBatchBodySchema` + `payableBatchItemSchema` + `payablesBatchResponseSchema`.
- [ ] Rota no `plugin.ts` + fiação em `composition.ts` (`FinancialHttpDeps.getPayablesSummaryByIds`).
- [ ] Coleção Bruno de smoke.

## Critérios de aceite (CA)

| # | Dado / Quando | Então |
| --- | --- | --- |
| CA1 | POST sem `Authorization` | **401** |
| CA2 | POST com token sem `fiscal-document:read` | **403** |
| CA3 | `refs` com UUID mal-formado | **400** (Zod) |
| CA4 | `refs: []` (vazio) | **400** (min 1) |
| CA5 | `refs` com > 200 itens | **400** (max 200) |
| CA6 | 1 payable semeado; `refs=[payableId, uuidInexistente]` | **200**; `items` = 1 com `ref==payableId` e campos do contrato; `missing=[uuidInexistente]` |
| CA7 | `POST /api/v2/financial/payablesXYZ` (path fora do custom method) | **404** (roteamento não vaza) |

> Driver `memory` nos testes de borda: `supplierName`/`supplierDocument` = `null` (read-model vazio sem
> worker); a resolução real via `fin_supplier_view` é coberta em `test:integration` / Bruno E2E.

## Gate

W0 RED antes de `src/` · W1 mínimo · W2 read-only (max 3 rounds) · W3 `typecheck` + `format:check` + `lint` + `test`.
