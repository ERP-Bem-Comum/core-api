# W3 — QUALITY — COLLABORATORS-HTTP-DETAIL (P1a)

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

ℹ tests 2011
ℹ suites 648
ℹ pass 1994
ℹ fail 0
ℹ skipped 17
```

EXIT_CODE encadeado = **0**.

## Varredura global `</content>`

`grep -rn "</content>"` em `*.ts/*.md/*.json/*.yaml/*.yml` (excl. node_modules/.git): **0 ocorrências** — repo limpo.

## Resultado

- typecheck: ✅ zero erros
- format:check: ✅ Prettier-clean
- lint: ✅ zero erros/warnings
- test: ✅ 1994 pass / 0 fail / 17 skipped (integração opt-in, pré-existente)

**Ticket pronto para fechar.** CAs do `000-request.md` verificados pelos 6 testes da P1a.
`GET /api/v1/collaborators/:id` no ar, espelhando o schema legado `Collaborator`.
