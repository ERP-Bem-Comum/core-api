# W3 — QUALITY — SUPPLIERS-HTTP-LIFECYCLE (S3)

> Skill: `ts-quality-checker` (gate final). **ALL GREEN.**

## Gates (encadeados, exit 0)
```
$ tsc --noEmit            (zero erros)
$ prettier --check .      All matched files use Prettier code style!
$ eslint .                (zero erros/warnings)
ℹ tests 2065 · pass 2048 · fail 0 · skipped 17
```
EXIT_CODE encadeado = 0.

**Ticket pronto para fechar.** POST /:id/deactivate + /:id/reactivate no ar. Fecha o CRUD core de Fornecedores.
