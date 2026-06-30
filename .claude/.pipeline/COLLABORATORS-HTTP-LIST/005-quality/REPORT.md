# W3 — QUALITY — COLLABORATORS-HTTP-LIST (P1b)

> Skill: `ts-quality-checker` (gate final). **ALL GREEN.**

## Gates (encadeados, exit 0)

`pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`

```
$ tsc --noEmit
(zero erros)

$ prettier --check .
Checking formatting...
All matched files use Prettier code style!

$ eslint .
(zero erros/warnings)

ℹ tests 2017
ℹ pass 2000
ℹ fail 0
ℹ skipped 17
```

EXIT_CODE encadeado = **0**.

## Correções aplicadas no W2/W3

- **W2 (lint):** teste de lista usava `type`/`ReadonlyArray` → `eslint --fix` → `interface`/`readonly[]`.
- **W3 (format):** o `--fix` deixou `interface Body {…}` em linha única → `prettier --write` reformatou.

Ambas só no arquivo de teste; código de produção intocado.

## Resultado

- typecheck ✅ · format:check ✅ · lint ✅ · test ✅ (2000 pass / 0 fail / 17 skipped opt-in).

**Ticket pronto para fechar.** `GET /api/v1/collaborators` paginado + 5 filtros, espelhando
`PaginatedCollaborators` legado.
