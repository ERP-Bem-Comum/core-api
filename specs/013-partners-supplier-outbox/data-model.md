# Phase 1 — Data Model: Partners outbox de fornecedor

Sem agregado novo. Novas tabelas de outbox `par_*` (migration) + evolução do `save` do supplier. Eventos de domínio do supplier inalterados; payload de integração montado no adapter.

## Tabela `par_outbox` (nova)

Espelha `ctr_outbox`. Append-only; `processed_at` marca entrega.

| Coluna           | Tipo               | Nulo | Nota                                          |
| ---------------- | ------------------ | :--: | --------------------------------------------- |
| `event_id`       | `char(36)` PK      | não  | UUID v4 do evento                             |
| `aggregate_id`   | `char(36)`         | não  | `supplierId`                                  |
| `aggregate_type` | `varchar(32)`      | não  | CHECK `IN ('Supplier')`                       |
| `event_type`     | `varchar(64)`      | não  | `SupplierRegistered` / `SupplierEdited`       |
| `schema_version` | `smallint`         | não  | começa em 1                                   |
| `occurred_at`    | `datetime(3)`      | não  | instante no domínio                           |
| `enqueued_at`    | `datetime(3)`      | não  | instante do INSERT                            |
| `processed_at`   | `datetime(3)`      | sim  | NULL = pendente                               |
| `attempts`       | `smallint` (def 0) | não  | CHECK ≥ 0                                     |
| `payload`        | `varchar(8192)`    | não  | `JSON.stringify` (sem JSON nativo — ADR-0020) |

Índices: `(processed_at, occurred_at)` (worker), `(aggregate_id)` (auditoria). CHECKs: `attempts >= 0`, `event_type` não-vazio, `aggregate_type IN ('Supplier')`.

## Tabela `par_outbox_dead_letter` (nova)

Espelha `ctr_outbox_dead_letter` — eventos que excederam `maxAttempts`, com a mensagem de erro.

## Evento de integração (payload)

Montado no adapter a partir do agregado `Supplier` (não é o evento de domínio):

| Campo         | Tipo          | Origem                             |
| ------------- | ------------- | ---------------------------------- |
| `supplierRef` | string (uuid) | `event.supplierId`                 |
| `name`        | string        | `supplier.name` (snapshot)         |
| `document`    | string (CNPJ) | `String(supplier.cnpj)` (snapshot) |
| `occurredAt`  | string (ISO)  | `event.occurredAt`                 |

- `SupplierRegistered`: snapshot no cadastro.
- `SupplierEdited`: snapshot **pós-edição** (toda edição publica — decisão do clarify).

## Evolução do `save` do supplier

- **Antes**: `save(supplier)` — SELECT + UPDATE/INSERT em autocommit (sem tx).
- **Depois**: `save(supplier, events: readonly SupplierEvent[])` — abre `db.transaction(tx => { persist(supplier); appendOutboxInTx(tx, events, supplier) })`. O agregado fica disponível para o mapper montar o payload. Os use cases `registerSupplier`/`editSupplier` passam `[event]`.

## Port de outbox (partners)

`OutboxPort.append(events): Promise<Result<void, OutboxAppendError>>` (shape público sem `tx`) + `WorkerOutboxOps` (worker). Adapters InMemory (testes) + Drizzle (tx). Espelha `contracts/application/ports/outbox.ts`.

## Fora de escopo (consumer — US2 da #47)

Tabela read-model `fin_supplier_view`, processamento dos eventos, `eventos_processados` do consumidor financial, leitura no DTO. Feature seguinte.
