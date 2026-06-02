# W1 — Implementação GREEN · CORE-CSV-SHARED-UTIL

> **Outcome:** GREEN · **Data:** 2026-06-01

## Arquivos

### Novo: `src/shared/utils/csv.ts`

- `BOM`, `SEPARATOR`, `LINE_TERMINATOR` (exportadas).
- `escapeCsvCell(raw)` — fusão de `neutralizeFormula` + `escapeCell` (anti-fórmula + RFC 4180).
- `toCsvLine(cells)` — `map(escapeCsvCell).join(SEPARATOR)`.
- `toCsv(headers, rows)` — `BOM + [headerLine, ...rowLines].join(CRLF) + CRLF`.
- Agnóstico de domínio. Sem `Result` (entrada já é `string`).

### Refactor: `src/modules/contracts/adapters/http/contracts-csv.ts`

- Removidos: `neutralizeFormula`, `escapeCell`, `toLine`, constantes `BOM/SEPARATOR/LINE_TERMINATOR` locais.
- `contractsToCsv` agora delega a `toCsv(HEADER, contracts.map((c) => cellsFor(contractToListItem(c))))`.
- `HEADER`, `cellsFor`, `periodEnd` mantidos (achatamento conhece o agregado/`status`).
- Import via `#src/shared/utils/csv.ts`.

## Execução (GREEN)

```
node --test ... tests/shared/utils/csv.test.ts \
                tests/modules/contracts/adapters/http/contracts-export-csv.routes.test.ts
ℹ tests 24 · pass 24 · fail 0
```

- Util novo: 15/15.
- Rede de segurança (rota CSV de contracts): 9/9 — **output idêntico byte-a-byte**, sem regressão.

W2 (audit read-only) a seguir.
