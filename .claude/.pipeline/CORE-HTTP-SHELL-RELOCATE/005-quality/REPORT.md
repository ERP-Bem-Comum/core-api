# W3 — Gate de Qualidade — CORE-HTTP-SHELL-RELOCATE

**Wave:** W3 · **Skill:** ts-quality-checker · **Outcome:** ALL-GREEN · **Data:** 2026-05-28

## Comandos e saídas

### `pnpm run typecheck` (tsc --noEmit)
```
zero erros
```

### `pnpm run lint` (eslint .)
```
limpo — zero warnings/errors
```
> `src/server.ts` ficou fora do glob de folgas (`src/shared/http/**`) e **não** acusou: não usa as
> relaxações de adapter (`promise-function-async`/`require-await`/`prefer-readonly-parameter-types`).

### `pnpm run format:check` (prettier --check .)
```
All matched files use Prettier code style!
```

### `pnpm test` (node:test + --experimental-strip-types)
```
ℹ tests 1414
ℹ pass  1398
ℹ fail  0
ℹ skipped 16
ℹ duration_ms ~20116
```
> Os 16 skip são o gate de integração `auth` (exige `MYSQL_INTEGRATION=1`, fora do gate padrão — ver
> memória `project_test_integration_auth_gap`). Não relacionados a este ticket.

## CAs

| CA | Status |
| :-- | :-- |
| CA1 comportamento preservado | ✅ 7 asserções do H0 verdes em `tests/shared/http/` |
| CA2 sem duplicata/órfão | ✅ `src/http/` + `tests/http/` removidos; `grep "#src/http/"` vazio |
| CA3 composition root | ✅ `src/server.ts` importa de `#src/shared/http/{app,config}.ts` |
| CA4 lint c/ novo glob | ✅ `src/shared/http/**` + `src/modules/*/adapters/http/**` |
| CA5 gate completo | ✅ typecheck + lint + format + test verdes |

## Veredito

**ALL-GREEN.** Ticket pronto para `close`. Follow-ups pós-fechamento (fora deste ticket): reapontar a SPEC
do `AUTH-HTTP-PLUGIN-EXPORT` aos novos paths e atualizar `EPIC-HTTP-CORE-API.md`.
