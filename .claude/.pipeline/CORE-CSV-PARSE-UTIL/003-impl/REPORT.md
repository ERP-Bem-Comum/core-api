# W1 — Implementação · CORE-CSV-PARSE-UTIL

**Wave**: W1 · **Outcome**: 🟡 YELLOW (testes passam; review/W3 pendentes)

## Mudanças
- `src/shared/utils/csv.ts`: + `Table`, `CsvParseError`, `tokenizeCsv`, `parseCsv` (RFC 4180; `csv-empty`/`csv-malformed`).
- `src/modules/contracts/cli/import-parser.ts`: removido o `tokenizeCsv` duplicado; passa a consumir o util compartilhado (mapeamento/validação de colunas permanece local).

## Prova (GREEN funcional)
- `tests/shared/utils/csv.test.ts` + `csv-parse.test.ts`: **23 pass / 0 fail**.
- Import de contracts (`import-parser.test.ts`, `import-contracts.test.ts`, `contracts.cli.import.test.ts`): **20 pass / 0 fail** — sem regressão.
