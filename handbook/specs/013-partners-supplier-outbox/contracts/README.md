# Phase 1 — Contrato de evento: `partners → financial`

Contrato de integração publicado pelo `partners` via outbox (ADR-0015), consumível por qualquer módulo. Registrar em **ADR + handbook** (FR-007). Versionado por `schema_version` (começa em 1).

## Garantias de entrega

- **At-least-once**: cada evento é entregue ao menos uma vez (worker com retry + dead-letter).
- **Idempotência**: cada evento tem `event_id` único; o consumidor deve aplicar uma única vez (ex.: tabela de eventos processados por `consumer_id` + `event_id`).
- **Atomicidade**: o evento só existe se a escrita do agregado confirmou (mesma transação).

## Eventos

### `SupplierRegistered`

Emitido quando um fornecedor é cadastrado.

```jsonc
{
  "supplierRef": "uuid", // id do fornecedor
  "name": "Fornecedor X LTDA",
  "document": "12345678000190", // CNPJ (14 dígitos, string)
  "occurredAt": "2026-06-16T21:00:00.000Z",
}
```

### `SupplierEdited`

Emitido em **toda** edição do fornecedor (snapshot pós-edição — decisão do clarify), independentemente de quais campos mudaram. O consumidor aplica via **upsert idempotente**.

```jsonc
{
  "supplierRef": "uuid",
  "name": "Fornecedor X LTDA (novo nome)",
  "document": "12345678000190",
  "occurredAt": "2026-06-16T21:05:00.000Z",
}
```

## Fora do contrato (por ora)

- `SupplierDeactivated` / `SupplierReactivated` — não publicados como contrato (não mudam nome/CNPJ). A infra de outbox os comporta no futuro, se um consumidor precisar.
- Outros agregados (`Financier`, `Collaborator`, `Act`) — fora do escopo.

## Consumidor previsto

`financial` (US2 da #47): mantém um read-model local `fin_supplier_view` (`supplierRef` → `name`, `document`), aplicando `SupplierRegistered` (insert) e `SupplierEdited` (upsert). **Não** consulta o `partners` em runtime.
