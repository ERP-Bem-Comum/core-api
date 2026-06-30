# W3 — QUALITY — COLLABORATORS-HTTP-LIST-FILTERS-PARITY (P1c)

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

ℹ tests 2026
ℹ pass 2009
ℹ fail 0
ℹ skipped 17
```

EXIT_CODE encadeado = **0**.

## Resultado

- typecheck ✅ · format:check ✅ · lint ✅ · test ✅ (2009 pass / 0 fail / 17 skipped opt-in).

**Ticket pronto para fechar.** 6 filtros legados adicionados (genderIdentities, races, educations,
disableReasons, roles, yearOfContract). `age` adiado por decisão do dono (follow-up).
