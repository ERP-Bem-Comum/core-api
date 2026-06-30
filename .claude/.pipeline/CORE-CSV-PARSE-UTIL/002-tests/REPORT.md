# W0 — Testes RED · CORE-CSV-PARSE-UTIL

**Wave**: W0 · **Outcome**: 🔴 RED (pelo motivo certo) · **Skill**: tdd-strategist

## Arquivo de teste

`tests/shared/utils/csv-parse.test.ts` — 9 casos cobrindo:
- `tokenizeCsv`: células simples, aspas com vírgula interna, `""`→`"`, CRLF≡LF.
- `parseCsv`: header/rows, ignora linhas em branco, vazio→`csv-empty`, aspas não fechadas→`csv-malformed`.

Deriva do BDD `collaborator-import.feature` (CT-004 vazio, CT-005 malformado) e do `data-model.md`
(`Table`, `CsvParseError`).

## Prova do RED

```
$ node --test --experimental-strip-types --no-warnings tests/shared/utils/csv-parse.test.ts
SyntaxError: The requested module '#src/shared/utils/csv.ts' does not provide an export named 'parseCsv'
✖ tests 1 · pass 0 · fail 1
```

RED **pelo motivo certo**: a API (`parseCsv`/`tokenizeCsv`/`Table`) ainda não existe no util compartilhado.
Não é erro de ambiente nem de sintaxe do teste.

## Próximo (W1)

Implementar `tokenizeCsv` + `parseCsv` em `src/shared/utils/csv.ts` (promover de `contracts/cli/import-parser.ts`),
depois refatorar o import-parser de contracts para consumir o util (sem regressão).
