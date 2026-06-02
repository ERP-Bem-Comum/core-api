# W0 — Testes RED · PARTNERS-SUPPLIER-CSV

> **Outcome:** RED · **Agente:** tdd-strategist · **Data:** 2026-06-01

## Arquivo

- `tests/modules/partners/adapters/export/supplier-csv.test.ts` (mirror de
  `src/modules/partners/adapters/export/supplier-csv.ts`, a criar em W1).

## Cobertura RED (mapeada aos CAs do 000-request)

| Suíte | CA | Casos |
| --- | --- | --- |
| header e vazio | CA-1, CA-7 | `suppliersToCsv([])` → `BOM + header + CRLF`; output inicia com BOM+header; cada linha termina em CRLF. |
| Active com bankAccount | CA-2 | 4 colunas bancárias preenchidas (`001`/`0001-2`/`123456`/`7`); pix + `deactivatedAt` vazias; `cnpj` = `String(supplier.cnpj)`. |
| Active com pixKey | CA-3 | `pixKeyType=email`/`pixKey=...` preenchidos; colunas bancárias vazias. |
| Inactive | CA-4 | `status=Inactive`; `deactivatedAt` em ISO 8601 (`DEACTIVATED_AT.toISOString()`). |
| projeção alimenta escape | CA-5 | nome com vírgula → citado `"..."`; nome iniciando em `=` → prefixo `'`. Escape **herdado** de `#src/shared/utils/csv.ts` (não re-testa a mecânica). |

Fixtures via `Supplier.register` (Active) e `Supplier.deactivate` (Inactive) — IDs/instantes
injetados (`NOW`, `DEACTIVATED_AT`). CNPJ válido `11.222.333/0001-81`, `serviceCategory=INFORMATICA`.

## Execução (RED)

```
node --test ... tests/modules/partners/adapters/export/supplier-csv.test.ts
✖ ERR_MODULE_NOT_FOUND: src/modules/partners/adapters/export/supplier-csv.ts
ℹ tests 1 · pass 0 · fail 1
```

RED por inexistência da API (fail-first). W1 cria `supplier-csv.ts` (projeção `supplierToCells` com
switch exaustivo por `status` + `toCsv` do util compartilhado) até GREEN.
