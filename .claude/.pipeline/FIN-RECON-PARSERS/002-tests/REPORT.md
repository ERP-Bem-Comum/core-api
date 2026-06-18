# W0 — RED · FIN-RECON-PARSERS (#119)

**Agente:** tdd-strategist · **Resultado:** 🔴 RED (testes falham por inexistência dos adapters)

## Citação canônica (Princípio IX — TDD/Beck)

Mesma base do #118 — Kent Beck, _TDD: Desenvolvimento Guiado por Testes_, p. 3 (linha 84): "Código
limpo que funciona [...] é o objetivo do TDD [...] uma forma previsível de desenvolver. Você sabe
quando acabou". W0 escreve o teste que falha primeiro; os adapters nascem no W1.

## Arquivos de teste (RED)

- `tests/modules/financial/adapters/statement-parsers/ofx-parser.test.ts` — CA1, CA3, CA4, CA6.
- `tests/modules/financial/adapters/statement-parsers/csv-parser.test.ts` — CA2, CA3, CA4.
- `tests/modules/financial/adapters/statement-parsers/bank-statement-parser.test.ts` — CA5 (dispatcher).

## Prova RED

```
✖ ofx-parser.test.ts          ERR_MODULE_NOT_FOUND .../adapters/statement-parsers/ofx-parser.ts
✖ csv-parser.test.ts          ERR_MODULE_NOT_FOUND .../adapters/statement-parsers/csv-parser.ts
✖ bank-statement-parser.test.ts  ERR_MODULE_NOT_FOUND .../adapters/statement-parsers/bank-statement-parser.ts
```

Falha por **inexistência** dos adapters — não por asserção. Correto para o fail-first.

## Contrato esperado (alvo do W1 GREEN)

### `application/ports/bank-statement-parser.ts`
- `ParseError = 'malformed-statement' | 'unsupported-format' | 'empty-content'`.
- `ParsedTransaction = Readonly<{ fitid: string | null; date: Date; movement: 'Debit'|'Credit'; entryType: string; payeeName: string; memo: string; valueCents: number; balanceAfterCents: number }>` — `fitid` **bruto** (null no CSV).
- `ParsedStatement = Readonly<{ periodStart: Date; periodEnd: Date; openingBalanceCents: number; closingBalanceCents: number; transactions: readonly ParsedTransaction[] }>`.
- `BankStatementParser = Readonly<{ parse: (format: 'OFX'|'CSV', content: string) => Result<ParsedStatement, ParseError> }>` (puro/sync).

### `adapters/statement-parsers/`
- `ofx-parser.ts` → `parseOfx(content): Result<ParsedStatement, ParseError>` — lê `<STMTTRN>` (TRNTYPE→movement, DTPOSTED→date, TRNAMT→valueCents **magnitude**, FITID→fitid, NAME→payeeName, MEMO→memo).
- `csv-parser.ts` → `parseCsv(content)` — header + linhas `;`; `fitid = null`; `DEBITO`→`Debit`/`CREDITO`→`Credit`; valor → centavos (magnitude).
- `bank-statement-parser.ts` → `bankStatementParser: BankStatementParser` (despacha por formato; outro → `unsupported-format`).
- `fake-parser.ts` → `ParsedStatement` canônico p/ testes de outras camadas.

**CA6:** sinal do valor vira **direção** (`Debit`/`Credit`), nunca `valueCents` negativo.
Node puro, **sem dependência** (ADR-0011). Adapters convertem erro de parsing em `Result` (nunca `throw` na borda).

## Próxima wave

W1 (skill `ports-and-adapters`) — implementar port + adapters OFX/CSV + dispatcher + fake até GREEN.
