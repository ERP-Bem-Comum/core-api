# CORE-CSV-PARSE-UTIL — Promover parsing CSV ao util compartilhado

**Épico**: `specs/001-partners-http-gaps/` (ticket #1) · **Size**: S · **ADR**: feature/adr-0002

## Escopo

Adicionar o **lado parsing** ao util compartilhado `src/shared/utils/csv.ts` (a serialização já existe).
Promover a lógica de tokenização CSV hoje **privada** em `src/modules/contracts/cli/import-parser.ts`
(`tokenizeCsv`), genérica e agnóstica de domínio — base do import de colaboradores (US-001).

## API esperada

```ts
export type Table = { readonly headers: readonly string[]; readonly rows: readonly (readonly string[])[] };
export type CsvParseError = 'csv-empty' | 'csv-malformed';
export const tokenizeCsv: (content: string) => readonly (readonly string[])[];
export const parseCsv: (content: string) => Result<Table, CsvParseError>;
```

## Critérios de aceitação

- `parseCsv` separa header das rows; ignora linhas de dados em branco; RFC 4180 (aspas, vírgula interna, `""`→`"`); CRLF/LF.
- Vazio/só espaços → `err('csv-empty')`; aspas não fechadas → `err('csv-malformed')`.
- `contracts/cli/import-parser.ts` passa a consumir o util (sem regressão; suíte de contracts verde).
- Não introduz dependência nova (parsing nativo).

## Fora de escopo

Rota de import (ticket #2); formatos não-CSV (ADR-0002 — destrancado, não construído).
