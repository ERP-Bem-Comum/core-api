# W3 — CTR-SWEEPER-DBURL-FILE — Quality Gate (GREEN) ✓

**Outcome:** GREEN · **Gate:** ts-quality-checker

## Resultado dos 4 gates

```
pnpm run typecheck     → verde (tsc --noEmit)
pnpm run format:check  → verde (All matched files use Prettier code style)
pnpm run lint          → verde (eslint . — 0 problems)
pnpm test              → 2496 testes · 2478 pass · 0 fail · 18 skipped
```

## Sem regressão

Baseline pré-ticket: 2488 testes. Pós-ticket: **2496** (+8 do `config.test.ts`). Zero falhas. Política de regressão zero respeitada.

## Escopo entregue

- `src/jobs/contracts/sweeper/config.ts` — `CONTRACTS_DATABASE_URL_FILE` (Docker secret) via reader injetável (`ConnectionFileReader` + `defaultConnectionFileReader`), XOR mutuamente exclusivo, 2 novos slugs de erro. `run.ts` inalterado.
- `tests/jobs/contracts/sweeper/config.test.ts` — 8 casos (tabela CA5 da #50).

## Veredito

W3 **GREEN**. Ticket pronto para `close`. Desbloqueia a issue #50 (compose `contracts-sweeper` + `secrets:setup` gera `contracts_database_url.txt`).
