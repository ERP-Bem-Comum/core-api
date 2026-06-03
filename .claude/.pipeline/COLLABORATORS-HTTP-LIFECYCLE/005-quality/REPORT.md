# W3 — QUALITY — COLLABORATORS-HTTP-LIFECYCLE (P3)

> Skill: `ts-quality-checker` (gate final). **ALL GREEN.**

## Gates (encadeados, exit 0)

```
$ tsc --noEmit            (zero erros)
$ prettier --check .      All matched files use Prettier code style!
$ eslint .                (zero erros/warnings)
ℹ tests 2044
ℹ pass 2027
ℹ fail 0
ℹ skipped 17
```

EXIT_CODE encadeado = **0**.

## Resultado

typecheck ✅ · format:check ✅ · lint ✅ · test ✅ (2027 pass / 0 fail / 17 skipped opt-in).

**Ticket pronto para fechar.** `POST /:id/deactivate` + `POST /:id/reactivate` no ar.
