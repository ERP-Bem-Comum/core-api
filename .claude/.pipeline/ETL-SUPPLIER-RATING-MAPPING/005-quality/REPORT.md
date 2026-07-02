# W3 — Quality gate (ETL-SUPPLIER-RATING-MAPPING)

- typecheck: PASS · format:check: PASS · lint: PASS
- pnpm test: 3362 tests, 3344 pass, 0 fail (18 skip = integração gated, correto)
- Integração gated do reader executada na VM do lab com Docker real: 1/1 PASS

## Regressões pré-existentes corrigidas (política de regressão zero)
- src/jobs/financial/payable-view-backfill/reader.ts + tests/.../backfill.test.ts:
  faltavam debitAccountRef/paidAt (#239 atualizou PayableView e esqueceu o backfill).
  Fix fiel à intenção: SELECT + mapeamento das 2 colunas da fonte de verdade.
- specs/030/031/032 *.md: prettier --write (só formatação).
