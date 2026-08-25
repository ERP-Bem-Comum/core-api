# Quickstart — Financial Supplier Read-Model

> Validação end-to-end do fluxo `partners` (produtor) → `par_outbox` → worker consumer → `fin_supplier_view` → grid.

## Pré-requisitos

- MySQL via Docker: `pnpm run test:integration:financial` / `:partners` já sobem o compose.
- Pré-requisito de produção já mergeado: `partners` publica `SupplierRegistered`/`SupplierEdited` no `par_outbox` (ADR-0043).

## 1. Gate de qualidade (sempre)

```bash
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

## 2. Consumer (worker dedicado) — read-model atualizado por eventos

```bash
# Lê par_outbox (partners) e projeta em fin_supplier_view (financial). 2 pools via env.
PARTNERS_DATABASE_URL=... FINANCIAL_DATABASE_URL=... pnpm run worker:supplier-projection
```

Fluxo esperado: cadastrar/editar fornecedor no `partners` → evento no `par_outbox` → worker entrega → `fin_supplier_view` reflete `{ supplierRef → name, document }` (consistência eventual).

## 3. Backfill (one-shot) — fornecedores legados

```bash
PARTNERS_DATABASE_URL=... FINANCIAL_DATABASE_URL=... pnpm run job:financial:supplier-view-backfill
```

Popula `fin_supplier_view` a partir dos fornecedores já existentes no `partners`. Idempotente (re-rodar é seguro; não regride linhas mais novas).

## 4. Grid enriquecido

```bash
# Após o read-model estar populado:
curl -s "http://localhost:3000/api/v2/financial/documents?page=1&pageSize=20" | jq '.items[0] | {supplierRef, supplierName, supplierDocument}'
```

Esperado: `supplierName`/`supplierDocument` preenchidos quando o `supplierRef` está no read-model; `null` quando ausente/nulo (sem erro).

## 5. Testes de integração

```bash
pnpm run test:integration:financial   # store drizzle (upsert + guard occurred_at) + grid com JOIN
```

## Validação dos Success Criteria

- **SC-001/002**: o item do grid traz nome+CNPJ sem o cliente resolver e sem chamada ao `partners` em runtime (só LEFT JOIN intra-`financial`).
- **SC-003**: editar fornecedor no `partners` → refletido no grid após um ciclo do worker.
- **SC-004**: documento com `supplierRef` nulo/ausente → campos `null`, listagem ok.
- **SC-005**: campos pré-existentes do item inalterados.
