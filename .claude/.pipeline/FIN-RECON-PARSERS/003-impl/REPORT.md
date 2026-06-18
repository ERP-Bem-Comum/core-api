# W1 — GREEN · FIN-RECON-PARSERS (#119)

**Agente:** ports-and-adapters · **Resultado:** 🟢 GREEN (9/9 testes do ticket)

## Arquivos criados

- `src/modules/financial/application/ports/bank-statement-parser.ts` — port `BankStatementParser` + tipos `ParsedStatement`/`ParsedTransaction` (`fitid: string | null`) + `ParseError`.
- `src/modules/financial/adapters/statement-parsers/amount.ts` — `parseAmountCents` (string → centavos com sinal, sem float).
- `src/modules/financial/adapters/statement-parsers/ofx-parser.ts` — `parseOfx` (lê `<STMTTRN>`).
- `src/modules/financial/adapters/statement-parsers/csv-parser.ts` — `parseCsv` (`;`-delimitado, fitid null).
- `src/modules/financial/adapters/statement-parsers/bank-statement-parser.ts` — dispatcher (`bankStatementParser`).
- `src/modules/financial/adapters/statement-parsers/fake-parser.ts` — `makeFakeParser` (double p/ #120).

## Prova GREEN

```
▶ ofx-parser              ✔ 4/4
▶ csv-parser              ✔ 3/3
▶ bank-statement-parser   ✔ 2/2
ℹ tests 9 · pass 9 · fail 0
```

Sanity adiantado (evita surpresa no W3): `pnpm run typecheck` ✅; `pnpm run lint` ✅ (após corrigir
1 nit `@typescript-eslint/prefer-regexp-exec` no `ofx-parser.ts` — `.match()` não-global → `.exec()`).

## Decisões de implementação

- **Port puro/sync**: parsing não faz I/O (string já em memória) → `Result` direto, sem `Promise`.
- **`movement` EN** derivado do tipo declarado (TRNTYPE / coluna `tipo`); `valueCents` = **magnitude**
  (sinal vira direção — CA6), sem valor negativo.
- **OFX**: regex tolerante por `<STMTTRN>` + `tag()` por campo; período de DTSTART/DTEND; BALAMT → saldo.
- **CSV BR**: split por `\n` + `;` (a util `shared/utils/csv.ts` é vírgula-based, não serve); `fitid: null`
  (síntese é do domínio #118).
- **Dispatcher**: `switch` exaustivo com `const _exhaustive: never` (sem `throw` no default — anti-padrão #7);
  formato fora de {OFX,CSV} → `unsupported-format`.
- **Sem dependência nova** (ADR-0011/D-FORMATS). Reuso de `isValidDate`. Erros sempre via `Result` (sem `throw` na borda).

## Escopo respeitado

Só parsing. **Sem** síntese de FITID/dedup (#118), persistência/use-case/HTTP (#120). `fitid` bruto.

## Próxima wave

W2 (skill `code-reviewer`) — audit read-only: conversão de erro em `Result`, pureza do parsing, EN,
aderência ao contrato do port.
