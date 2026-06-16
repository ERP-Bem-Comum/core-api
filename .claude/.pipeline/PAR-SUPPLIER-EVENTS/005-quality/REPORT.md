# W3 — Gate de Qualidade (PAR-SUPPLIER-EVENTS)

**Resultado:** 🟢 GREEN — todos os comandos verdes.

## Gate (`pnpm run`)

| Comando | Resultado |
| :--- | :--- |
| `typecheck` (`tsc --noEmit`) | ✅ sem erros |
| `format:check` (`prettier --check .`) | ✅ "All matched files use Prettier code style!" |
| `lint` (`eslint .`) | ✅ sem warnings/erros |
| `test` (`node --test`) | ✅ **2619 pass** / 0 fail / 18 skipped (integração atrás de opt-in) |

## Integração MySQL

| Comando | Resultado |
| :--- | :--- |
| `test:integration:partners` | ✅ **38 pass** / 0 fail / 0 skipped |

Inclui `supplier-repository.drizzle.test.ts` (atomicidade `save` + `appendOutboxInTx`
na mesma `db.transaction`) e `outbox-repository.drizzle-mysql.test.ts`. Os `Failed query`
no log são violações de UNIQUE **intencionais** dos testes de integridade ETL
(`Duplicate entry ... ER_DUP_ENTRY`) que asseguram `integrity-violation` — casos verdes.

## Política de regressão zero

Nenhum gate fechado em vermelho. 18 skips em `pnpm test` são suítes de integração
gateadas por env (`MYSQL_INTEGRATION`/`STORAGE_INTEGRATION`/etc.) — rodam verde no home
correto (`test:integration:*`), conforme §II.
