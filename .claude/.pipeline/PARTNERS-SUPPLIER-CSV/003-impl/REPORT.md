# W1 — Implementação GREEN · PARTNERS-SUPPLIER-CSV

> **Outcome:** GREEN · **Data:** 2026-06-01

## Arquivo: `src/modules/partners/adapters/export/supplier-csv.ts`

- `suppliersToCsv(suppliers: readonly Supplier[]): string` — função pura.
- `supplierToCells(s)` — projeção concreta: switch exaustivo por `status` (`Active`/`Inactive`),
  achata em 15 células na ordem do `HEADER`.
- Destino de pagamento discriminado: `bank?.x ?? ''` / `pix?.x ?? ''` (colunas vazias quando null).
- `deactivatedAt` via `.toISOString()` só no ramo `Inactive`; vazio em `Active`.
- `cnpj` via `String(s.cnpj)` (branded normalizado).
- **Serialização delegada** a `toCsv(HEADER, ...)` do util `#src/shared/utils/csv.ts` — zero escape
  local (CA atendido: adapter não declara BOM/separador/escape próprios).

## Execução (GREEN)

```
node --test ... tests/modules/partners/adapters/export/supplier-csv.test.ts
ℹ tests 9 · pass 9 · fail 0
```

Cobre: vazio/header/CRLF, Active+bank, Active+pix, Inactive (ISO), projeção→escape (vírgula citada,
`=` prefixado). W2 (audit read-only) a seguir.
