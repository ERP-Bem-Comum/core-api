# FIN-RECON-PARSERS — escopo

**GitHub:** #119 (sub-issue da feature #60 → épico #64) · **Feature SDD:** `specs/017-fin-conciliacao-bancaria/` · **Size:** M

## Objetivo

Implementar o port `BankStatementParser` + adapters **OFX** e **CSV** (Node puro, **sem dependência de
terceiros** — ADR-0011/D-FORMATS) que traduzem o conteúdo bruto do arquivo num `ParsedStatement`
(estrutura limpa consumida pela importação do #120). Decisão D-FORMATS: só OFX/CSV (XLSX/PDF exigem lib).

## Em escopo

1. **Port** `application/ports/bank-statement-parser.ts`:
   - Tipos `ParsedTransaction` (com `fitid: string | null` — **bruto**; CSV pode não ter FITID nativo),
     `ParsedStatement`, `ParseError = 'malformed-statement' | 'unsupported-format' | 'empty-content'`.
   - `BankStatementParser = Readonly<{ parse: (format: 'OFX' | 'CSV', content: string) => Result<ParsedStatement, ParseError> }>`.
   - Parsing é **puro/sync** (sem I/O — o conteúdo já chega como string).
2. **Adapter OFX** `adapters/statement-parsers/ofx-parser.ts` — `parseOfx(content): Result<ParsedStatement, ParseError>`:
   - lê `<STMTTRN>` (TRNTYPE→movement, DTPOSTED→date, TRNAMT→valueCents, FITID→fitid, NAME→payeeName, MEMO→memo), saldos e período.
3. **Adapter CSV** `adapters/statement-parsers/csv-parser.ts` — `parseCsv(content): Result<ParsedStatement, ParseError>`:
   - header + linhas `;`-delimitadas; `fitid` nasce `null` (a síntese é responsabilidade do domínio/#120).
4. **Dispatcher** `adapters/statement-parsers/bank-statement-parser.ts` — implementa o port, despacha por formato.
5. **Fake** `adapters/statement-parsers/fake-parser.ts` — `ParsedStatement` canônico para testes de outras camadas.

`movement` em **EN** (`Debit`/`Credit`); valores em **centavos** (inteiro); datas `Date`.

## Fora de escopo

Síntese de FITID e dedup (já no #118). Persistência/migration/use-case/HTTP (#120).

## Critérios de aceite

- **CA1**: Dado um OFX válido com 2 `<STMTTRN>`, `parseOfx` retorna `ok` com 2 `ParsedTransaction`,
  `fitid` nativo preenchido, `movement` mapeado (DEBIT→`Debit`), `valueCents` inteiro.
- **CA2**: Dado um CSV válido (header + 2 linhas `;`), `parseCsv` retorna `ok` com 2 transações e
  `fitid === null` em todas.
- **CA3**: Dado conteúdo OFX/CSV malformado (sem estrutura reconhecível), retorna `err('malformed-statement')`.
- **CA4**: Dado conteúdo vazio (`''`), retorna `err('empty-content')`.
- **CA5**: O dispatcher `parse('OFX', ofx)` e `parse('CSV', csv)` delegam ao adapter correto; formato
  fora de {OFX,CSV} → `err('unsupported-format')`.
- **CA6**: Valores monetários negativos no arquivo (saída) viram `movement: 'Debit'` com `valueCents`
  **positivo** (magnitude) — o sinal vira direção, não valor negativo.

## Definition of Done

W0 RED → W1 GREEN (skill `ports-and-adapters`) → W2 review → W3 gate verde. Adapters convertem qualquer
erro de parsing em `Result` (nunca `throw` cruzando a borda). Sem dependência nova no `package.json`.
