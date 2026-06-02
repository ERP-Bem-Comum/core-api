# W0 — Testes RED · PARTNERS-SUPPLIER-PERSISTENCE

> **Outcome:** RED · **Agente:** tdd-strategist · **Data:** 2026-06-01

## Arquivos

1. `tests/modules/partners/adapters/persistence/supplier.mapper.test.ts` — **unit, gate default**.
2. `tests/modules/partners/adapters/persistence/repos/supplier-repository.drizzle.test.ts` —
   **integração, gated `MYSQL_INTEGRATION=1`** (espelha o Financier).

## Cobertura RED

### Mapper (gate default)

| Suíte | Casos |
| --- | --- |
| `supplierToInsert` | Active+bank (4 colunas `bank_account_*`, pix null); Active+pix (pix preenchido, bank null); Inactive (`active=false`, `deactivated_at`). |
| `supplierFromRow` | reconstrói Active+bank, Active+pix, Inactive; round-trip bank; round-trip pix; rejeita id inválido; rejeita cnpj inválido; **rejeita row sem destino de pagamento** (bank e pix nulos → invariante). |

### Repo Drizzle (gated)

save→findById (bank preservado); round-trip pix (campos achatados); findByCnpj; list; CNPJ duplicado
(id distinto) → `supplier-cnpj-duplicate`.

## APIs exercitadas (a criar em W1)

- `Supplier.rehydrate` (domínio).
- `par_suppliers` + `SupplierRow` (`schemas/mysql.ts`).
- `supplierToInsert`/`supplierFromRow` (`mappers/supplier.mapper.ts`).
- `createDrizzleSupplierStore` (`repos/supplier-repository.drizzle.ts`).

## Execução (RED)

```
mapper:      ✖ ERR_MODULE_NOT_FOUND: mappers/supplier.mapper.ts · tests 1 · fail 1
integração:  ✖ ERR_MODULE_NOT_FOUND: repos/supplier-repository.drizzle.ts · tests 1 · fail 1
```

RED por inexistência da API (fail-first). W1 cria domínio.rehydrate + schema + mapper + repo até GREEN.
Pós-W1, a suíte de integração registra 0 casos sem `MYSQL_INTEGRATION` (skipped), como o Financier.
