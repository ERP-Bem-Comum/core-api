# Phase 1 — Data Model: Financial Supplier Read-Model

## Tabela nova: `fin_supplier_view` (read-model, módulo financial)

Cópia local denormalizada de fornecedor, mantida por eventos do `partners`. Não-agregado (read-model). Prefixo `fin_*` (ADR-0014). Sem FK cross-módulo (o `supplier_ref` referencia logicamente o `partners`, mas **não** há constraint física — isolamento ADR-0014).

| Coluna         | Tipo MySQL     | Nulo | Notas                                                                                    |
| -------------- | -------------- | :--: | ---------------------------------------------------------------------------------------- |
| `supplier_ref` | `varchar(36)`  | não  | **PK**. UUID do fornecedor no `partners` (`aggregateId`/`supplierRef` do evento).        |
| `name`         | `varchar(255)` | não  | Snapshot do nome (último evento aplicado).                                               |
| `document`     | `varchar(20)`  | não  | CNPJ **alfanumérico** (ADR-0044) — texto, sem máscara. 14 chars hoje; folga p/ evolução. |
| `occurred_at`  | `datetime(3)`  | não  | `occurredAt` do evento aplicado. **Guard de recência** (não regride).                    |
| `updated_at`   | `datetime(3)`  | não  | Quando a linha foi gravada (auditoria do consumer).                                      |

- **Índice**: PK em `supplier_ref` basta (lookup por ref no JOIN da listagem e no upsert). Sem índice secundário (cardinalidade modesta).
- **Drizzle**: definir em `src/modules/financial/adapters/persistence/schemas/mysql.ts` (`finSupplierView`); `pnpm run db:generate`.
- **Restrições (ADR-0020)**: sem JSON/ENUM/trigger. Upsert via `INSERT ... ON DUPLICATE KEY UPDATE` com guard `occurred_at`.

### Regra de aplicação (pura) — `domain/supplier-view`

`applySupplierEventToView(current: SupplierView | null, incoming: SupplierView): SupplierView`:

- `current === null` → grava `incoming`.
- `incoming.occurredAt >= current.occurredAt` → grava `incoming` (última-escrita-vence por recência).
- senão → mantém `current` (evento fora de ordem; FR-003).

`SupplierView = Readonly<{ supplierRef: string; name: string; document: string; occurredAt: Date }>`.

### Parsing do payload de integração (ADR-0043)

O evento chega como `ProcessedEvent` com `payload: string` (JSON). O consumer:

1. Filtra `eventType ∈ { 'SupplierRegistered', 'SupplierEdited' }` (demais → skip/ok).
2. `JSON.parse(payload)` → valida shape `{ supplierRef, name, document, occurredAt }` (Result; payload malformado → erro de delivery, vai p/ retry/DLQ).
3. Monta `SupplierView` (`occurredAt` via `new Date(payload.occurredAt)`).

## Port novo: `SupplierViewStore` (application/ports)

```text
SupplierViewStore = Readonly<{
  upsert: (view: SupplierView) => Promise<Result<void, SupplierViewStoreError>>;   // upsert + guard occurred_at
  get:    (supplierRef: string) => Promise<Result<SupplierView | null, SupplierViewStoreError>>;
}>;
SupplierViewStoreError = 'supplier-view-store-unavailable';
```

Adapters: `supplier-view-store.drizzle.ts` (ON DUPLICATE KEY UPDATE com guard) + `supplier-view-store.in-memory.ts` (Map + guard em memória).

## Entidade alterada: `DocumentListItem` (read-model da listagem)

`src/modules/financial/domain/document/query.ts` — adicionar:

| Campo              | Tipo             | Origem                                                  |
| ------------------ | ---------------- | ------------------------------------------------------- |
| `supplierName`     | `string \| null` | `fin_supplier_view.name` (LEFT JOIN por `supplier_ref`) |
| `supplierDocument` | `string \| null` | `fin_supplier_view.document`                            |

`null` quando `supplier_ref` é nulo ou ausente na cópia (FR-006). Demais campos inalterados (FR-008).

## DTO / Schema HTTP (item da listagem)

`adapters/http/dto.ts` (`listItemToSummaryDto`): mapear `supplierName`/`supplierDocument` direto (string|null).
`adapters/http/schemas.ts` (`documentSummarySchema`): `+ supplierName: z.string().nullable()`, `+ supplierDocument: z.string().nullable()`.

## Eventos consumidos (não produzidos)

`SupplierRegistered`, `SupplierEdited` — contrato ADR-0043 (`{ supplierRef, name, document, occurredAt }`, `aggregateType: 'Supplier'`). Esta feature é **consumidor**; não emite eventos novos.
