# W3 — QUALITY — COLLABORATORS-HTTP-REGISTER (P2)

> Skill: `ts-quality-checker` (gate final). **ALL GREEN.**

## Gates (encadeados, exit 0)

`pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`

```
$ tsc --noEmit
(zero erros)

$ prettier --check .
All matched files use Prettier code style!

$ eslint .
(zero erros/warnings)

ℹ tests 2036
ℹ pass 2019
ℹ fail 0
ℹ skipped 17
```

EXIT_CODE encadeado = **0**.

## Correção no W1/W2

- lint (`--fix`): `res.headers['location'] as string` → `!` (non-null-assertion-style) no teste.

## Resultado

- typecheck ✅ · format:check ✅ · lint ✅ · test ✅ (2019 pass / 0 fail / 17 skipped opt-in).

**Ticket pronto para fechar.** `POST /api/v1/collaborators` (201 + Location) e
`PATCH /:id/complete-registration` (200) no ar.
