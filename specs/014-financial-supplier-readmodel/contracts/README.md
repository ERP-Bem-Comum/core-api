# Contracts — Financial Supplier Read-Model

## 1. Contrato HTTP — item de `GET /api/v2/financial/documents`

**Adição apenas** (FR-008/009). Cada elemento de `items[]` ganha dois campos:

```jsonc
{
  // ...campos pré-existentes (inalterados): id, status, documentNumber, type,
  //    supplierRef, series, grossValueCents, paymentMethod, contractRef,
  //    netValueCents, dueDate, version ...
  "supplierName": "Gráfica Boa Impressão", // string | null
  "supplierDocument": "11222333000181", // string | null — CNPJ alfanumérico (ADR-0044)
}
```

- `supplierName`/`supplierDocument` = `null` quando `supplierRef` é nulo ou ainda ausente no read-model (FR-006) — listagem **não** falha.
- Paginação inalterada: `{ items, page, pageSize, total }` (FR-009).
- Zod (`schemas.ts`): `supplierName: z.string().nullable()`, `supplierDocument: z.string().nullable()`.

### Testes de contrato (W0 RED)

- `fastify.inject` em `GET /documents`: item com `supplierRef` presente no read-model → `supplierName`/`supplierDocument` preenchidos; `supplierRef` nulo/ausente → ambos `null`; campos pré-existentes byte-idênticos.

## 2. Contrato de consumo — evento de fornecedor (entrada, ADR-0043)

O consumer recebe `ProcessedEvent` (envelope do outbox do `partners`) com `payload` string:

```jsonc
// envelope (ProcessedEvent)
{ "eventId": "uuid", "eventType": "SupplierRegistered" | "SupplierEdited",
  "aggregateId": "uuid", "aggregateType": "Supplier", "occurredAt": "ISO",
  "payload": "<string JSON abaixo>" }

// payload (JSON.parse) — contrato ADR-0043
{ "supplierRef": "uuid", "name": "string", "document": "string", "occurredAt": "ISO" }
```

Comportamento do consumer (`applySupplierEvent`):

- `eventType ∉ { SupplierRegistered, SupplierEdited }` → `ok` (skip — não é do contrato).
- payload válido → `upsert` no `fin_supplier_view` com guard de `occurred_at` (idempotente; não regride).
- payload malformado / store indisponível → `err(DeliveryUnavailable)` → worker faz retry/DLQ (at-least-once).

### Testes de contrato (W0 RED)

- `SupplierRegistered` → linha criada; `SupplierEdited` posterior → atualizada (snapshot novo).
- mesmo evento 2× → idempotente; evento com `occurredAt` antigo → **não** regride.
- `SupplierDeactivated`/qualquer outro `eventType` → skip (sem escrita), retorna ok.

## 3. Contrato do backfill (one-shot)

Job lê fornecedores existentes via public-api do `partners` (lista `{ supplierRef, name, document }`) e aplica cada um pelo `applySupplierEvent`/store (idempotente). `occurredAt` do backfill = instante de leitura (ou o `updatedAt` do fornecedor, se exposto) — registros reais por evento sempre vencem se mais novos.

### Testes (W0 RED)

- Com N fornecedores no `partners` e read-model vazio → após backfill, N linhas em `fin_supplier_view`.
- Re-rodar backfill → sem duplicação (idempotente); não sobrescreve linha mais nova vinda de evento real.
