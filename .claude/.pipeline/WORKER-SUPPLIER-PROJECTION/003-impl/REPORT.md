# W1 — Implementação (WORKER-SUPPLIER-PROJECTION)

**Resultado:** 🟢 GREEN — disciplina `nodejs-runtime-expert`.

## Criado (composition root — `src/workers/supplier-view-projection/`)

- `delivery.ts` — `createSupplierProjectionDelivery(store)`: `EventDelivery` (consumer
  `'financial-supplier-view'`) que cola a mensagem do `par_outbox` ao `applySupplierEvent` (financial
  public-api); falha → `DeliveryError` (worker → retry/DLQ). `rowToMessage`: `OutboxRow` → `{ eventType, payload }` (opaco).
- `run.ts` — entrypoint: abre **2 pools** (`openPartnersMysql` p/ ler `par_outbox` + `openMysqlFinancial`
  p/ escrever `fin_supplier_view`), monta o `runLoop` **genérico** (`shared/outbox`) com o delivery acima,
  graceful shutdown (SIGTERM/SIGINT, `AbortSignal`). Migrations não aplicadas aqui (ADR-0041).
- `package.json` — script `worker:supplier-projection`.
- `financial/public-api/index.ts` — exporta `SupplierViewStore` (type) para o composition root.

## Topologia (decisão ADR-0045)

`par_outbox` (pool partners) → `runLoop` genérico → `EventDelivery` (composition root) →
`applySupplierEvent` (financial public-api) → `fin_supplier_view` (pool financial). **Nenhum módulo
importa o outro** — a ligação vive no composition root (como `server.ts`). A infra (drivers/outbox repo)
é importada na montagem; a lógica de aplicação vem da public-api do financial.

## Execução

```
pnpm run typecheck / lint → verde
delivery.test.ts → 4/4 (unit)
test:integration:financial → 20/20, inclui e2e "par_outbox → fin_supplier_view" contra MySQL real
```
