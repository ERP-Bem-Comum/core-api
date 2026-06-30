# W1 — Implementação (FIN-SUPPLIER-VIEW-SCHEMA)

**Resultado:** 🟢 GREEN — disciplina `drizzle-schema-author` + `ports-and-adapters`.

## Criado

- `domain/supplier-view/types.ts` — `SupplierView = { supplierRef, name, document, occurredAt }` (read-model, não-agregado).
- `application/ports/supplier-view-store.ts` — port `SupplierViewStore` (`upsert`/`get`) + erro `'supplier-view-store-unavailable'`.
- `adapters/persistence/repos/supplier-view-store.in-memory.ts` — `createInMemorySupplierViewStore` com guard de recência (`Map`).
- `adapters/persistence/schemas/mysql.ts` — tabela `finSupplierView` (PK `supplier_ref` varchar(36), `name`, `document` varchar(20) alfanumérico, `occurred_at`/`updated_at` datetime(3)) + tipos `SupplierViewRow`/`NewSupplierViewRow`.
- `migrations/mysql/0003_dapper_joseph.sql` — gerada por `db:generate:financial` + CHARSET/COLLATE manual (PK `utf8mb4_bin`, tabela `utf8mb4_unicode_ci`).
- `adapters/persistence/repos/supplier-view-store.drizzle.ts` — `createDrizzleSupplierViewStore(handle, clock)`: upsert `INSERT ... ON DUPLICATE KEY UPDATE` com **guard** `if(values(occurred_at) >= occurred_at, ...)` por coluna (idempotente + fora-de-ordem, atômico); `get` por `supplier_ref`.
- Teste de integração `supplier-view-store.drizzle-mysql.test.ts` (consome a suíte) + adicionado ao script `test:integration:financial`.

## Decisões

- **Guard de recência atômico** via `ON DUPLICATE KEY UPDATE` (ADR-0020) — sem SELECT-then-UPDATE, seguro entre consumers concorrentes (multi-instância futura).
- Suíte de contrato usa `supplierRef` **único por caso** (`nextRef`) → isolamento tanto no in-memory quanto no MySQL compartilhado.
- `updatedAt` (auditoria) via `Clock` injetado; `document` como texto (alfanumérico — ADR-0044).

## Execução

```
pnpm run typecheck → verde · pnpm run lint → verde
in-memory store contract → 5/5
```

Validação do adapter Drizzle (upsert SQL + guard) contra MySQL real → W3 (`test:integration:financial`).
