# W0 — Testes RED · CORE-CSV-SHARED-UTIL

> **Outcome:** RED · **Agente:** tdd-strategist · **Data:** 2026-06-01

## Arquivo

- `tests/shared/utils/csv.test.ts` (mirror de `src/shared/utils/csv.ts`, a ser criado em W1).

## Cobertura RED

| Suíte | Casos |
| --- | --- |
| `constants` | `BOM` = U+FEFF; `SEPARATOR` = `,`; `LINE_TERMINATOR` = `\r\n`. |
| `escapeCsvCell — anti-fórmula` | 6 gatilhos: `= + - @ \t \r`. Inclui o caso combinado `\r` (fórmula + RFC4180 → `"'\rfoo"`). Célula comum/vazia inalterada. |
| `escapeCsvCell — RFC 4180` | vírgula, aspas internas duplicadas, LF, CRLF → quoting. |
| `toCsvLine` | join com SEPARATOR; escaping por célula; célula vazia. |
| `toCsv` | header sem linhas → `BOM + header + CRLF`; header + linhas termina em CRLF; escaping nas linhas; sempre inicia com BOM. |

Comportamento espelha byte-a-byte `src/modules/contracts/adapters/http/contracts-csv.ts:38-96`
(fusão `neutralizeFormula`+`escapeCell` → `escapeCsvCell`; `toLine` → `toCsvLine`; montagem do
`contractsToCsv` → `toCsv`).

## Execução (RED)

```
node --test --experimental-strip-types --no-warnings tests/shared/utils/csv.test.ts
✖ ERR_MODULE_NOT_FOUND: src/shared/utils/csv.ts
ℹ tests 1 · pass 0 · fail 1
```

RED por inexistência da API (fail-first correto). W1 cria `src/shared/utils/csv.ts` até GREEN e
migra `contracts-csv.ts` para consumir o util sem alterar o output (rede:
`tests/modules/contracts/adapters/http/contracts-export-csv.routes.test.ts`).
