# W3 — Gate de Qualidade (FIN-SUPPLIER-VIEW-SCHEMA)

**Resultado:** 🟢 GREEN — disciplina `ts-quality-checker`.

## Gate (`pnpm run`)

| Comando | Resultado |
| :--- | :--- |
| `typecheck` | ✅ sem erros |
| `format:check` | ✅ (após `format` nos metadados gerados pelo drizzle-kit: `_journal.json`, `0003_snapshot.json`) |
| `lint` | ✅ sem erros |
| `test` | ✅ **2638 pass** / 0 fail / 18 skip |

## Integração MySQL

| Comando | Resultado |
| :--- | :--- |
| `test:integration:financial` | ✅ **19 pass** — inclui `SupplierViewStore` Drizzle: upsert cria/atualiza, **guard de recência** (mais antigo não regride), idempotência — contra MySQL real |

## Política de regressão zero

`format:check` vermelho corrigido na causa (`pnpm run format` nos snapshots do drizzle-kit) — não
suprimido. Nenhum gate fechado em vermelho. A sintaxe do upsert `ON DUPLICATE KEY UPDATE` com guard
foi validada contra MySQL 8.4 real (não só typecheck).

## Resultado

`fin_supplier_view` + `SupplierViewStore` (in-memory + Drizzle) prontos. Base para os próximos
tickets da 014 (`FIN-SUPPLIER-VIEW-APPLY` → consumer; `FIN-SUPPLIER-VIEW-LIST-DTO` → grid).
