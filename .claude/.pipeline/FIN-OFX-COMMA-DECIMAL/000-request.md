# FIN-OFX-COMMA-DECIMAL — escopo (#531)

> Size **S**. `parseAmountCents` só aceita ponto decimal. Bradesco exporta OFX com **vírgula**
> (`-845,00`) → toda transação vira `null` → `parseOfx` devolve `malformed-statement` → o extrato
> inteiro é rejeitado. Fix: normalizar `,`→`.` + fixture de regressão.

## Problema (#531)
- `src/modules/financial/adapters/statement-parsers/amount.ts:5` — regex `^-?\d+(\.\d{1,2})?$` só casa ponto.
- `ofx-parser.ts:36` — `parseAmountCents(amountRaw) === null → err('malformed-statement')`. Uma transação
  com vírgula derruba o extrato todo.
- Também afeta `csv-parser.ts` (mesma função) — o fix vale para os dois parsers.

## Escopo (in)
1. `parseAmountCents`: normalizar vírgula decimal → ponto **antes** do regex/parse (`raw.replace(',', '.')`).
   O caminho com ponto segue funcionando (sem regressão).
2. **Fixture de regressão** OFX estilo Bradesco (TRNAMT com vírgula) → `parseOfx` retorna `ok` com as
   transações e valores corretos em centavos.

## Fora de escopo (YAGNI)
- Separador de milhar (`1.234,56`) — OFX `<TRNAMT>` não usa agrupamento; entrada real é decimal simples.
  Se aparecer, é nova issue. O comportamento atual para esse sub-caso (`null`) **não regride**.

## Critérios de aceite
- **CA1** `parseAmountCents('123,45') === 12345` (era `null`).
- **CA2** `parseAmountCents('-845,00') === -84500`.
- **CA3** Sem regressão do ponto: `parseAmountCents('1200.00') === 120000`, `parseAmountCents('123') === 12300`.
- **CA4** Não-numérico segue `null`: `parseAmountCents('abc') === null`, `parseAmountCents('') === null`.
- **CA5** OFX Bradesco (vírgula) → `parseOfx` retorna `ok`, transações com `valueCents` corretos (não mais
  `malformed-statement`).
- **CA6** Regressão zero: `pnpm test` verde.

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — vírgula decimal (CA1/CA2/CA5) + guarda de não-regressão do ponto (CA3/CA4) |
| W1 | (main) | normalizar `,`→`.` |
| W3 | `ts-quality-checker` | gate |
